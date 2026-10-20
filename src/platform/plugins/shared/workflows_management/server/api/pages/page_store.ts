/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v5 as uuidv5 } from 'uuid';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { WorkflowPageAttributes } from './page_saved_object';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import { computePageSecretHash, generatePageSecret, isPageSecretValid } from './page_secret';

/** Fixed namespace for the page id, so one workflow in one space always maps to one page. */
const PAGE_ID_NAMESPACE = '6f1c2b4e-3d5a-4e8f-9a7b-0c1d2e3f4a5b';

interface PageRef {
  spaceId: string;
  workflowId: string;
}

export const getPageId = ({ spaceId, workflowId }: PageRef): string =>
  uuidv5(`${spaceId}|${workflowId}`, PAGE_ID_NAMESPACE);

type PageRunIdentity = Pick<WorkflowPageAttributes, 'apiKey' | 'apiKeyId' | 'runAsUsername'>;

/**
 * Stores page credentials. Callers authorize first: every method runs as the
 * internal user, because the public route has no Kibana identity.
 */
export class WorkflowPageStore {
  constructor(
    private readonly deps: {
      /** Must run the encryption extension, or the secrets are written in plaintext. */
      client: SavedObjectsClientContract;
      encryptedClient: EncryptedSavedObjectsClient;
      invalidateApiKey: (apiKeyId: string) => Promise<void>;
    }
  ) {}

  /** Returns the page secret, and creates the page the first time an author asks for it. */
  async getOrCreateSecret(ref: PageRef): Promise<string> {
    const existing = await this.readPage(ref);
    if (existing) {
      return existing.secret;
    }
    try {
      return await this.write(ref, { overwrite: false });
    } catch (error) {
      // Two authors opened the share dialog at once: return the page the other one made.
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      const created = await this.readPage(ref);
      if (!created) {
        throw error;
      }
      return created.secret;
    }
  }

  /** Replaces the secret. The old URL stops working at once. The run identity stays. */
  async rotate(ref: PageRef): Promise<string> {
    const existing = await this.readPage(ref);
    return this.write(ref, { overwrite: true, identity: existing && pickIdentity(existing) });
  }

  /**
   * Makes the page run as the user who just saved the workflow. Keeps the URL, and
   * invalidates the key of the previous saver.
   */
  async setRunIdentity(
    ref: PageRef,
    identity: Required<Pick<PageRunIdentity, 'apiKey' | 'apiKeyId' | 'runAsUsername'>>
  ): Promise<void> {
    const existing = await this.readPage(ref);
    try {
      await this.write(ref, { overwrite: true, secret: existing?.secret, identity });
    } catch (error) {
      await this.deps.invalidateApiKey(identity.apiKeyId);
      throw error;
    }
    if (existing?.apiKeyId && existing.apiKeyId !== identity.apiKeyId) {
      await this.deps.invalidateApiKey(existing.apiKeyId);
    }
  }

  /** Returns the encoded API key a page run launches with, or `undefined` when none is set. */
  async getRunApiKey(ref: PageRef): Promise<string | undefined> {
    return (await this.readPage(ref))?.apiKey;
  }

  /** Returns the user a page runs as, without decrypting anything. */
  async getRunAsUsername(ref: PageRef): Promise<string | undefined> {
    return (await this.getPage(ref))?.runAsUsername;
  }

  /** Deletes the page and its key, so a page trigger added later gets a new secret. */
  async retire(ref: PageRef): Promise<void> {
    const existing = await this.getPage(ref);
    if (!existing) {
      return;
    }
    try {
      await this.deps.client.delete(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, getPageId(ref), {
        namespace: SavedObjectsUtils.namespaceStringToId(ref.spaceId),
      });
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }
    if (existing.apiKeyId) {
      await this.deps.invalidateApiKey(existing.apiKeyId);
    }
  }

  /** Checks a presented secret against the stored hash. Never decrypts. */
  async verify(ref: PageRef & { secret: string }): Promise<boolean> {
    const { spaceId, workflowId, secret } = ref;
    const page = await this.getPage(ref);
    return Boolean(
      page &&
        page.enabled &&
        page.workflowId === workflowId &&
        isPageSecretValid({ workflowId, spaceId, secret, secretHash: page.secretHash })
    );
  }

  /** Reads the page without its encrypted attributes. */
  private async getPage(ref: PageRef): Promise<WorkflowPageAttributes | undefined> {
    try {
      const { attributes } = await this.deps.client.get<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        getPageId(ref),
        { namespace: SavedObjectsUtils.namespaceStringToId(ref.spaceId) }
      );
      return attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async readPage(ref: PageRef): Promise<WorkflowPageAttributes | undefined> {
    try {
      const { attributes } =
        await this.deps.encryptedClient.getDecryptedAsInternalUser<WorkflowPageAttributes>(
          WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
          getPageId(ref),
          { namespace: SavedObjectsUtils.namespaceStringToId(ref.spaceId) }
        );
      return attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Writes the whole page. ESO forbids partial updates of encrypted attributes, so every
   * change rewrites the object. A new secret is generated unless one is passed.
   */
  private async write(
    ref: PageRef,
    {
      overwrite,
      secret = generatePageSecret(),
      identity,
    }: { overwrite: boolean; secret?: string; identity?: PageRunIdentity }
  ): Promise<string> {
    const { spaceId, workflowId } = ref;
    await this.deps.client.create<WorkflowPageAttributes>(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      {
        workflowId,
        secret,
        secretHash: computePageSecretHash({ workflowId, spaceId, secret }),
        enabled: true,
        createdAt: new Date().toISOString(),
        ...identity,
      },
      {
        id: getPageId(ref),
        overwrite,
        namespace: SavedObjectsUtils.namespaceStringToId(spaceId),
      }
    );
    return secret;
  }
}

const pickIdentity = ({ apiKey, apiKeyId, runAsUsername }: PageRunIdentity): PageRunIdentity => ({
  apiKey,
  apiKeyId,
  runAsUsername,
});
