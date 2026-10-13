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

/**
 * Stores page credentials. Callers authorize first: every method runs as the
 * internal user, because the public route has no Kibana identity.
 */
export class WorkflowPageStore {
  constructor(
    private readonly deps: {
      /** Must run the encryption extension, or the secret is written in plaintext. */
      client: SavedObjectsClientContract;
      encryptedClient: EncryptedSavedObjectsClient;
    }
  ) {}

  /** Returns the page secret, and creates the page the first time an author asks for it. */
  async getOrCreateSecret(ref: PageRef): Promise<string> {
    const existing = await this.readSecret(ref);
    if (existing) {
      return existing;
    }
    try {
      return await this.write(ref, { overwrite: false });
    } catch (error) {
      // Two authors opened the share dialog at once: return the page the other one made.
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      const created = await this.readSecret(ref);
      if (!created) {
        throw error;
      }
      return created;
    }
  }

  /** Replaces the secret. The old URL stops working at once. */
  async rotate(ref: PageRef): Promise<string> {
    return this.write(ref, { overwrite: true });
  }

  /** Deletes the page, so a page trigger added later gets a new secret. */
  async retire(ref: PageRef): Promise<void> {
    try {
      await this.deps.client.delete(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, getPageId(ref), {
        namespace: SavedObjectsUtils.namespaceStringToId(ref.spaceId),
      });
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }
  }

  /** Checks a presented secret against the stored hash. Never decrypts. */
  async verify(ref: PageRef & { secret: string }): Promise<boolean> {
    const { spaceId, workflowId, secret } = ref;
    try {
      const { attributes } = await this.deps.client.get<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        getPageId(ref),
        { namespace: SavedObjectsUtils.namespaceStringToId(spaceId) }
      );
      return (
        attributes.enabled &&
        attributes.workflowId === workflowId &&
        isPageSecretValid({ workflowId, spaceId, secret, secretHash: attributes.secretHash })
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  private async readSecret(ref: PageRef): Promise<string | undefined> {
    try {
      const { attributes } =
        await this.deps.encryptedClient.getDecryptedAsInternalUser<WorkflowPageAttributes>(
          WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
          getPageId(ref),
          { namespace: SavedObjectsUtils.namespaceStringToId(ref.spaceId) }
        );
      return attributes.secret;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async write(ref: PageRef, { overwrite }: { overwrite: boolean }): Promise<string> {
    const { spaceId, workflowId } = ref;
    const secret = generatePageSecret();
    await this.deps.client.create<WorkflowPageAttributes>(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      {
        workflowId,
        secret,
        secretHash: computePageSecretHash({ workflowId, spaceId, secret }),
        enabled: true,
        createdAt: new Date().toISOString(),
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
