/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chunk } from 'lodash';
import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { getPageTriggerId, isPageTrigger } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { getWorkflowPageSavedObjectId, WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAttributes } from './page_saved_object';
import { computePageSecretHash, generatePageSecret, isPageSecretValid } from './page_secret';
import type { WorkflowPageRef } from './page_secret';
import { getPageOrUndefined, isPageOnline, namespaceOf } from './utils';

// A find returns at most 10,000 objects. 1,000 workflows leave room for stale pages.
const FIND_WORKFLOW_IDS_PER_REQUEST = 1_000;
const FIND_MAX_PAGES = 10_000;

/** The page ids a definition asks for. Global workflows never get a page. */
const getWantedPageIds = (spaceId: string, definition: WorkflowYaml | null | undefined) =>
  spaceId === GLOBAL_WORKFLOW_SPACE_ID
    ? new Set<string>()
    : new Set((definition?.triggers ?? []).filter(isPageTrigger).map(getPageTriggerId));

/** Page operations that run without a user. Only workflows internals get this client. */
export interface WorkflowPagesSystemClient {
  /**
   * Makes the stored pages match the page triggers of a saved definition.
   * Creates a page for a new trigger: enabled, but offline until it gets an access level.
   * Retires the pages of removed triggers, so a trigger added back gets a new secret.
   * Skips invalid definitions: a save with a typo must not retire a working link.
   */
  syncWorkflowPages(params: {
    workflowId: string;
    /** The workflow's `created_at`. Pages of an earlier workflow with the same id are retired. */
    workflowCreatedAt: string;
    spaceId: string;
    definition: WorkflowYaml | null | undefined;
    valid: boolean;
  }): Promise<void>;
  /** Deletes every page of the given workflows. Workflow deletes call it. */
  retireWorkflowPages(params: { workflowIds: string[]; spaceId: string }): Promise<void>;
  /**
   * Checks a secret from a public URL. True only for an online page whose hash matches.
   * Never decrypts, and returns false for every miss, so callers cannot tell them apart.
   */
  verifyPageSecret(ref: WorkflowPageRef, secret: string): Promise<boolean>;
}

export interface WorkflowPagesSystemClientDeps {
  logger: Logger;
  /** False without an encryption key. No page is created and every page is offline. */
  canEncrypt: boolean;
  /** Internal client with the page type. */
  savedObjectsClient: SavedObjectsClientContract;
}

export class WorkflowPagesSystemClientImpl implements WorkflowPagesSystemClient {
  constructor(private readonly deps: WorkflowPagesSystemClientDeps) {}

  async syncWorkflowPages({
    workflowId,
    workflowCreatedAt,
    spaceId,
    definition,
    valid,
  }: Parameters<WorkflowPagesSystemClient['syncWorkflowPages']>[0]): Promise<void> {
    if (!valid) {
      return;
    }
    const wanted = getWantedPageIds(spaceId, definition);
    const existing = await this.findWorkflowPages([workflowId], spaceId);

    const isCurrent = ({ attributes }: SavedObject<WorkflowPageAttributes>) =>
      wanted.has(attributes.pageId) && attributes.workflowCreatedAt === workflowCreatedAt;
    await this.deletePages(
      existing.filter((page) => !isCurrent(page)),
      spaceId
    );

    const existingIds = new Set(
      existing.filter(isCurrent).map(({ attributes }) => attributes.pageId)
    );
    const toCreate = [...wanted].filter((pageId) => !existingIds.has(pageId));
    if (toCreate.length === 0) {
      return;
    }
    if (!this.deps.canEncrypt) {
      this.deps.logger.warn(
        `Workflow [${workflowId}] has a page trigger, but pages need an encryption key. The page stays offline.`
      );
      return;
    }
    await Promise.all(
      toCreate.map((pageId) => this.createPage({ workflowId, spaceId, pageId }, workflowCreatedAt))
    );
  }

  async retireWorkflowPages({
    workflowIds,
    spaceId,
  }: {
    workflowIds: string[];
    spaceId: string;
  }): Promise<void> {
    if (workflowIds.length === 0) {
      return;
    }
    await this.deletePages(await this.findWorkflowPages(workflowIds, spaceId), spaceId);
  }

  async verifyPageSecret(ref: WorkflowPageRef, secret: string): Promise<boolean> {
    if (!this.deps.canEncrypt) {
      return false;
    }
    const page = await getPageOrUndefined(this.deps.savedObjectsClient, ref);
    return (
      page !== undefined &&
      page.attributes.workflowId === ref.workflowId &&
      page.attributes.pageId === ref.pageId &&
      isPageOnline(page.attributes, this.deps.canEncrypt) &&
      isPageSecretValid(ref, secret, page.attributes.secretHash)
    );
  }

  private async createPage(ref: WorkflowPageRef, workflowCreatedAt: string): Promise<void> {
    const secret = generatePageSecret();
    try {
      await this.deps.savedObjectsClient.create<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        {
          workflowId: ref.workflowId,
          pageId: ref.pageId,
          secret,
          secretHash: computePageSecretHash(ref, secret),
          access: null,
          enabled: true,
          workflowCreatedAt,
        },
        {
          id: getWorkflowPageSavedObjectId(ref),
          namespace: namespaceOf(ref.spaceId),
          overwrite: false,
          refresh: 'wait_for',
        }
      );
    } catch (error) {
      // A concurrent save already made the page. Keep its secret.
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }
  }

  private async findWorkflowPages(
    workflowIds: string[],
    spaceId: string
  ): Promise<Array<SavedObject<WorkflowPageAttributes>>> {
    const pages: Array<SavedObject<WorkflowPageAttributes>> = [];
    // One page per workflow today, so a chunk always fits in one response.
    for (const ids of chunk(workflowIds, FIND_WORKFLOW_IDS_PER_REQUEST)) {
      const { saved_objects: found } =
        await this.deps.savedObjectsClient.find<WorkflowPageAttributes>({
          type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
          namespaces: [spaceId],
          perPage: FIND_MAX_PAGES,
          filter: nodeBuilder.or(
            ids.map((workflowId) =>
              nodeBuilder.is(`${WORKFLOW_PAGE_SAVED_OBJECT_TYPE}.attributes.workflowId`, workflowId)
            )
          ),
        });
      pages.push(...found);
    }
    return pages;
  }

  private async deletePages(
    pages: Array<SavedObject<WorkflowPageAttributes>>,
    spaceId: string
  ): Promise<void> {
    if (pages.length === 0) {
      return;
    }
    const { statuses } = await this.deps.savedObjectsClient.bulkDelete(
      pages.map(({ id }) => ({ type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id })),
      { namespace: namespaceOf(spaceId), refresh: 'wait_for' }
    );
    const failed = statuses.filter(({ success, error }) => !success && error?.statusCode !== 404);
    if (failed.length > 0) {
      throw new Error(
        `Failed to retire workflow pages: ${failed
          .map(({ id, error }) => `${id} (${error?.message ?? 'unknown error'})`)
          .join(', ')}`
      );
    }
  }
}
