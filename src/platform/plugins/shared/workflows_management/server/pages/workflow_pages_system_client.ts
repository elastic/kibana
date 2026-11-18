/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chunk, groupBy } from 'lodash';
import type {
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { nodeBuilder } from '@kbn/es-query';
import { getPageTriggerId, isPageTrigger } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  getWorkflowPageSavedObjectId,
  partiallyUpdateWorkflowPage,
  WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
} from './page_saved_object';
import type { WorkflowPageAttributes } from './page_saved_object';
import { computePageSecretHash, generatePageSecret, isPageSecretValid } from './page_secret';
import type { WorkflowPageRef } from './page_secret';
import type {
  WorkflowPageAuditLog,
  WorkflowPageMissReason,
  WorkflowPageRetireReason,
} from './types';
import { getPageOrUndefined, isPageOnline, namespaceOf } from './utils';
import { WorkflowPagesUnavailableError } from './workflow_pages_unavailable_error';

// A find returns at most 10,000 objects. 1,000 workflows leave room for stale pages.
const FIND_WORKFLOW_IDS_PER_REQUEST = 1_000;
const FIND_PER_PAGE = 10_000;

/** The page ids a definition asks for. Global workflows never get a page. */
const getWantedPageIds = (spaceId: string, definition: WorkflowYaml | null | undefined) =>
  spaceId === GLOBAL_WORKFLOW_SPACE_ID
    ? new Set<string>()
    : new Set((definition?.triggers ?? []).filter(isPageTrigger).map(getPageTriggerId));

export type VerifyPageSecretResult =
  | { workflowCreatedAt: string }
  | {
      reason: Extract<
        WorkflowPageMissReason,
        'page_not_found' | 'page_offline' | 'secret_mismatch'
      >;
    };

/** Page operations that run without a user. Only workflows internals get this client. */
export interface WorkflowPagesSystemClient {
  /**
   * Makes the stored pages match the page triggers of a saved definition.
   * Creates a page for a new trigger: enabled, but offline until it gets an access level.
   * Retires the pages of removed triggers, so a trigger added back gets a new secret.
   * Skips invalid saves, so pages follow the last valid definition: a typo must not retire a
   * shared link, and the page is offline while the workflow is invalid anyway.
   */
  syncWorkflowPages(params: {
    workflowId: string;
    /** The workflow's `created_at`. Pages of an earlier workflow with the same id are retired. */
    workflowCreatedAt: string;
    spaceId: string;
    definition: WorkflowYaml | null | undefined;
    valid: boolean;
    request?: KibanaRequest;
  }): Promise<void>;
  /** Deletes the pages whose trigger the definition no longer has. Throws when a delete fails. */
  retireRemovedPages(params: {
    workflowId: string;
    spaceId: string;
    definition: WorkflowYaml | null | undefined;
    request?: KibanaRequest;
  }): Promise<void>;
  /**
   * Takes the pages of a workflow offline by clearing their access level. The secret stays, so
   * publishing again brings back the same link. Throws when an update fails.
   */
  unpublishWorkflowPages(params: {
    workflowId: string;
    spaceId: string;
    request?: KibanaRequest;
  }): Promise<void>;
  /** Deletes every page of the given workflows in the space. Throws when a delete fails. */
  retireWorkflowPages(params: {
    workflowIds: string[];
    spaceId: string;
    reason: WorkflowPageRetireReason;
    request?: KibanaRequest;
  }): Promise<void>;
  /**
   * Checks a secret from a page URL against the page alone, so a visitor without the secret never
   * reaches the workflow. Returns the `created_at` of the page's workflow, or why it failed.
   * Never decrypts.
   */
  verifyPageSecret(ref: WorkflowPageRef, secret: string): Promise<VerifyPageSecretResult>;
}

export interface WorkflowPagesSystemClientDeps {
  logger: Logger;
  /** False without an encryption key. A sync that needs a new page throws, and every page is offline. */
  canEncrypt: boolean;
  /** Internal client with the page type. */
  savedObjectsClient: SavedObjectsClientContract;
  /** The internal client has no security extension, so the page lifecycle audits itself. */
  audit: Pick<WorkflowPageAuditLog, 'logPageCreated' | 'logPageRetired' | 'logPageAccessChanged'>;
}

export class WorkflowPagesSystemClientImpl implements WorkflowPagesSystemClient {
  constructor(private readonly deps: WorkflowPagesSystemClientDeps) {}

  async syncWorkflowPages({
    workflowId,
    workflowCreatedAt,
    spaceId,
    definition,
    valid,
    request,
  }: Parameters<WorkflowPagesSystemClient['syncWorkflowPages']>[0]): Promise<void> {
    if (!valid) {
      return;
    }
    const wanted = getWantedPageIds(spaceId, definition);
    // Workflow ids are unique across spaces, so a page of this workflow in another space is
    // left from a move into this space, such as a bulk overwrite, and must go.
    const existing = await this.findWorkflowPages([workflowId], ALL_NAMESPACES_STRING);

    const retireReason = ({
      attributes,
      namespaces,
    }: SavedObject<WorkflowPageAttributes>): WorkflowPageRetireReason | undefined => {
      if (namespaces?.[0] !== spaceId) return 'workflow_moved';
      if (attributes.workflowCreatedAt !== workflowCreatedAt) return 'stale_workflow';
      if (!wanted.has(attributes.pageId)) return 'trigger_removed';
    };
    await this.deletePages(
      existing.flatMap((page) => {
        const reason = retireReason(page);
        return reason ? [{ page, reason }] : [];
      }),
      request
    );

    const existingIds = new Set(
      existing.filter((page) => !retireReason(page)).map(({ attributes }) => attributes.pageId)
    );
    const toCreate = [...wanted].filter((pageId) => !existingIds.has(pageId));
    if (toCreate.length === 0) {
      return;
    }
    if (!this.deps.canEncrypt) {
      throw new WorkflowPagesUnavailableError();
    }
    await Promise.all(
      toCreate.map((pageId) =>
        this.createPage({ workflowId, spaceId, pageId }, workflowCreatedAt, request)
      )
    );
  }

  async retireRemovedPages({
    workflowId,
    spaceId,
    definition,
    request,
  }: Parameters<WorkflowPagesSystemClient['retireRemovedPages']>[0]): Promise<void> {
    const wanted = getWantedPageIds(spaceId, definition);
    const pages = await this.findWorkflowPages([workflowId], spaceId);
    await this.deletePages(
      pages
        .filter(({ attributes }) => !wanted.has(attributes.pageId))
        .map((page) => ({ page, reason: 'trigger_removed' as const })),
      request
    );
  }

  async unpublishWorkflowPages({
    workflowId,
    spaceId,
    request,
  }: Parameters<WorkflowPagesSystemClient['unpublishWorkflowPages']>[0]): Promise<void> {
    const published = (await this.findWorkflowPages([workflowId], spaceId)).filter(
      ({ attributes }) => attributes.access !== null
    );
    await Promise.all(
      published.map(async ({ id, attributes: { pageId } }) => {
        const ref = { workflowId, spaceId, pageId };
        try {
          await partiallyUpdateWorkflowPage(
            this.deps.savedObjectsClient,
            id,
            { access: null },
            { namespace: namespaceOf(spaceId), refresh: 'wait_for' }
          );
          this.deps.audit.logPageAccessChanged(request, { ...ref, access: null });
        } catch (error) {
          this.deps.audit.logPageAccessChanged(request, { ...ref, access: null, error });
          throw error;
        }
      })
    );
  }

  async retireWorkflowPages({
    workflowIds,
    spaceId,
    reason,
    request,
  }: Parameters<WorkflowPagesSystemClient['retireWorkflowPages']>[0]): Promise<void> {
    if (workflowIds.length === 0) {
      return;
    }
    const pages = await this.findWorkflowPages(workflowIds, spaceId);
    await this.deletePages(
      pages.map((page) => ({ page, reason })),
      request
    );
  }

  async verifyPageSecret(ref: WorkflowPageRef, secret: string): Promise<VerifyPageSecretResult> {
    const page = await getPageOrUndefined(this.deps.savedObjectsClient, ref);
    if (page?.attributes.workflowId !== ref.workflowId || page.attributes.pageId !== ref.pageId) {
      return { reason: 'page_not_found' };
    }
    // The secret goes first, so the audit log tells a leaked secret from a guess on an offline page.
    if (!isPageSecretValid(ref, secret, page.attributes.secretHash)) {
      return { reason: 'secret_mismatch' };
    }
    if (!isPageOnline(page.attributes, this.deps.canEncrypt)) {
      return { reason: 'page_offline' };
    }
    return { workflowCreatedAt: page.attributes.workflowCreatedAt };
  }

  private async createPage(
    ref: WorkflowPageRef,
    workflowCreatedAt: string,
    request: KibanaRequest | undefined
  ): Promise<void> {
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
      this.deps.audit.logPageCreated(request, ref);
    } catch (error) {
      // A concurrent save already made the page, and audited it. Keep its secret.
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        this.deps.audit.logPageCreated(request, { ...ref, error });
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
          perPage: FIND_PER_PAGE,
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

  /**
   * Deletes pages in their own spaces, and audits each one. A found page always has exactly one
   * space. A page that is already gone was retired, and audited, by someone else.
   */
  private async deletePages(
    pages: Array<{ page: SavedObject<WorkflowPageAttributes>; reason: WorkflowPageRetireReason }>,
    request: KibanaRequest | undefined
  ): Promise<void> {
    const results = await Promise.all(
      Object.entries(groupBy(pages, ({ page }) => page.namespaces?.[0])).map(
        async ([spaceId, group]) => {
          const { statuses } = await this.deps.savedObjectsClient.bulkDelete(
            group.map(({ page }) => ({ type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id: page.id })),
            { namespace: namespaceOf(spaceId), refresh: 'wait_for' }
          );
          // Statuses come back in request order.
          return statuses.map((status, index) => ({ ...status, ...group[index], spaceId }));
        }
      )
    );
    const deleted = results.flat().filter(({ error }) => error?.statusCode !== 404);
    for (const { page, reason, spaceId, success, error } of deleted) {
      const { workflowId, pageId } = page.attributes;
      this.deps.audit.logPageRetired(request, {
        workflowId,
        pageId,
        spaceId,
        reason,
        ...(success ? {} : { error: new Error(error?.message ?? 'unknown error') }),
      });
    }
    const failed = deleted.filter(({ success }) => !success);
    if (failed.length > 0) {
      throw new Error(
        `Failed to retire workflow pages: ${failed
          .map(({ id, error }) => `${id} (${error?.message ?? 'unknown error'})`)
          .join(', ')}`
      );
    }
  }
}
