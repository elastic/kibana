/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { nodeBuilder } from '@kbn/es-query';
import {
  getPageTriggerId,
  isPageTrigger,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import type {
  WorkflowAccessOperation,
  WorkflowsManagementApiActions,
  WorkflowYaml,
} from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  getWorkflowPageSavedObjectId,
  partiallyUpdateWorkflowPage,
  WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
} from './page_saved_object';
import type { WorkflowPageAccess, WorkflowPageAttributes } from './page_saved_object';
import { computePageSecretHash, generatePageSecret, isPageSecretValid } from './page_secret';
import type { WorkflowPageRef } from './page_secret';
import { WorkflowPageNotFoundError } from './workflow_page_not_found_error';
import { WorkflowPagePrivilegesError } from './workflow_page_privileges_error';
import { WorkflowPagesUnavailableError } from './workflow_pages_unavailable_error';

/** What callers see of a page. Never holds the secret or its hash. */
export interface WorkflowPageDto {
  workflowId: string;
  pageId: string;
  access: WorkflowPageAccess | null;
  offline: boolean;
  /** True when the public route serves the page. */
  online: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** The audit events of page operations. Workflow saves and deletes audit the lifecycle. */
export interface WorkflowPageAuditLog {
  logPageLinkRead(request: KibanaRequest, params: WorkflowPageAuditParams): void;
  logPageSecretRotated(request: KibanaRequest, params: WorkflowPageAuditParams): void;
  logPageAccessChanged(
    request: KibanaRequest,
    params: WorkflowPageAuditParams & { access: WorkflowPageAccess | null }
  ): void;
  logPageOfflineChanged(
    request: KibanaRequest,
    params: WorkflowPageAuditParams & { offline: boolean }
  ): void;
}

export type WorkflowPageAuditParams = WorkflowPageRef & { error?: unknown };

export interface WorkflowPagesServiceDeps {
  logger: Logger;
  /** False without an encryption key. Pages then stay offline and no page is created. */
  canEncrypt: boolean;
  /** Internal client with the page type. Only the lifecycle and the public check use it. */
  getInternalClient: () => Promise<SavedObjectsClientContract>;
  /** Request-scoped client with the page type. Writes use it, so core sets `updated_by`. */
  getScopedClient: (request: KibanaRequest) => Promise<SavedObjectsClientContract>;
  getEncryptedClient: () => Promise<EncryptedSavedObjectsClient>;
  /** The `workflows.pages.enabled` feature flag. */
  isEnabled: () => Promise<boolean>;
  audit: WorkflowPageAuditLog;
  /** True when the caller's role grants every API action in the space. */
  hasPrivileges: (
    request: KibanaRequest,
    spaceId: string,
    apiActions: readonly WorkflowsManagementApiActions[]
  ) => Promise<boolean>;
  /** Throws when the workflow is missing or its ACL denies the operation to the caller. */
  assertWorkflowAccess: (
    workflow: { workflowId: string; spaceId: string },
    operation: WorkflowAccessOperation,
    request: KibanaRequest
  ) => Promise<void>;
}

/** The page operations, keyed like `WorkflowsManagementOperationPrivileges`. */
export type WorkflowPageOperation = 'readPage' | 'managePage';

/**
 * The workflow ACL operation that every page operation needs. Anyone who can run the
 * workflow can serve its page, so taking a page offline needs no workflow edit access.
 */
const PAGE_WORKFLOW_ACCESS_OPERATION: WorkflowAccessOperation = 'execute';

const FIND_PER_PAGE = 100;

const namespaceOf = (spaceId: string): string | undefined =>
  SavedObjectsUtils.namespaceStringToId(spaceId);

const isOnline = (attributes: WorkflowPageAttributes, canEncrypt: boolean): boolean =>
  canEncrypt && !attributes.offline && attributes.access != null;

/** The page ids a definition asks for. Global workflows never get a page. */
const getWantedPageIds = (spaceId: string, definition: WorkflowYaml | null | undefined) =>
  spaceId === GLOBAL_WORKFLOW_SPACE_ID
    ? new Set<string>()
    : new Set((definition?.triggers ?? []).filter(isPageTrigger).map(getPageTriggerId));

/**
 * Owns the `workflow-page` saved objects.
 *
 * - Lifecycle: workflow saves and deletes call `syncWorkflowPages` and `retireWorkflowPages`.
 * - Public check: `verifyPageSecret` compares hashes and never decrypts.
 * - Page operations take the request. Routes check the API privileges, and the scoped
 *   saved objects client checks the saved object privileges and records `updated_by`.
 */
export class WorkflowPagesService {
  constructor(private readonly deps: WorkflowPagesServiceDeps) {}

  /**
   * Makes the stored pages match the page triggers of a saved definition.
   * Creates a page for a new trigger, offline and without an access level.
   * Retires the pages of removed triggers, so a trigger added back gets a new secret.
   * Skips invalid definitions: a save with a typo must not retire a working link.
   */
  async syncWorkflowPages({
    workflowId,
    spaceId,
    definition,
    valid,
  }: {
    workflowId: string;
    spaceId: string;
    definition: WorkflowYaml | null | undefined;
    valid: boolean;
  }): Promise<void> {
    if (!valid || !(await this.deps.isEnabled())) {
      return;
    }
    const wanted = getWantedPageIds(spaceId, definition);
    const client = await this.deps.getInternalClient();
    const existing = await this.findWorkflowPages(client, [workflowId], spaceId);

    const toRetire = existing.filter(({ attributes }) => !wanted.has(attributes.pageId));
    await this.deletePages(client, toRetire, spaceId);

    const existingIds = new Set(existing.map(({ attributes }) => attributes.pageId));
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
      toCreate.map((pageId) => this.createPage(client, { workflowId, spaceId, pageId }))
    );
  }

  /** Deletes every page of the given workflows. Workflow deletes call it. */
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
    const client = await this.deps.getInternalClient();
    const pages = await this.findWorkflowPages(client, workflowIds, spaceId);
    await this.deletePages(client, pages, spaceId);
  }

  /**
   * Checks a secret from a public URL. True only for an online page whose hash matches.
   * Never decrypts, and returns false for every miss, so callers cannot tell them apart.
   */
  async verifyPageSecret(ref: WorkflowPageRef, secret: string): Promise<boolean> {
    if (!this.deps.canEncrypt) {
      return false;
    }
    const client = await this.deps.getInternalClient();
    const page = await this.getOrUndefined(client, ref);
    return (
      page !== undefined &&
      page.attributes.workflowId === ref.workflowId &&
      page.attributes.pageId === ref.pageId &&
      isOnline(page.attributes, this.deps.canEncrypt) &&
      isPageSecretValid(ref, secret, page.attributes.secretHash)
    );
  }

  async getPage(ref: WorkflowPageRef, request: KibanaRequest): Promise<WorkflowPageDto> {
    await this.authorize(ref, request, 'readPage');
    const page = await this.getOrUndefined(await this.deps.getInternalClient(), ref);
    if (!page) {
      throw new WorkflowPageNotFoundError(ref.pageId, ref.workflowId);
    }
    return this.toDto(page);
  }

  /** Decrypts the secret for the Share link. The only operation that decrypts. */
  async getPageSecret(ref: WorkflowPageRef, request: KibanaRequest): Promise<string> {
    this.assertCanEncrypt();
    try {
      await this.authorize(ref, request, 'readPage');
      const encryptedClient = await this.deps.getEncryptedClient();
      const { attributes } =
        await encryptedClient.getDecryptedAsInternalUser<WorkflowPageAttributes>(
          WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
          getWorkflowPageSavedObjectId(ref),
          { namespace: namespaceOf(ref.spaceId) }
        );
      this.deps.audit.logPageLinkRead(request, ref);
      return attributes.secret;
    } catch (error) {
      this.deps.audit.logPageLinkRead(request, { ...ref, error });
      throw this.toPageError(error, ref);
    }
  }

  /** Replaces the secret. The old link fails at once. Returns the new secret. */
  async rotatePageSecret(ref: WorkflowPageRef, request: KibanaRequest): Promise<string> {
    this.assertCanEncrypt();
    try {
      await this.authorize(ref, request, 'managePage');
      const client = await this.deps.getScopedClient(request);
      const { version } = await client.get<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        getWorkflowPageSavedObjectId(ref),
        { namespace: namespaceOf(ref.spaceId) }
      );
      const secret = generatePageSecret();
      // Writes the secret with every AAD attribute, so ESO encrypts it with the full AAD.
      // The `version` makes a concurrent rotation fail instead of losing a secret.
      await client.update<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        getWorkflowPageSavedObjectId(ref),
        {
          workflowId: ref.workflowId,
          pageId: ref.pageId,
          secret,
          secretHash: computePageSecretHash(ref, secret),
        },
        { namespace: namespaceOf(ref.spaceId), version, refresh: 'wait_for' }
      );
      this.deps.audit.logPageSecretRotated(request, ref);
      return secret;
    } catch (error) {
      this.deps.audit.logPageSecretRotated(request, { ...ref, error });
      throw this.toPageError(error, ref);
    }
  }

  /** Sets the access level. `null` removes it, which takes the page offline. */
  async setPageAccess(
    ref: WorkflowPageRef,
    access: WorkflowPageAccess | null,
    request: KibanaRequest
  ): Promise<WorkflowPageDto> {
    return this.partialUpdate(ref, request, { access }, (error) =>
      this.deps.audit.logPageAccessChanged(request, { ...ref, access, error })
    );
  }

  /** Takes the page offline or brings it back. Needs neither workflow update nor security admin. */
  async setPageOffline(
    ref: WorkflowPageRef,
    offline: boolean,
    request: KibanaRequest
  ): Promise<WorkflowPageDto> {
    return this.partialUpdate(ref, request, { offline }, (error) =>
      this.deps.audit.logPageOfflineChanged(request, { ...ref, offline, error })
    );
  }

  /**
   * Checks the caller before a page operation, in two steps:
   * 1. Kibana privileges: the role grants the operation in the page's space.
   * 2. Workflow ACL: the user can run this workflow.
   */
  private async authorize(
    ref: WorkflowPageRef,
    request: KibanaRequest,
    operation: WorkflowPageOperation
  ): Promise<void> {
    const privileges = WorkflowsManagementOperationPrivileges[operation];
    if (!(await this.deps.hasPrivileges(request, ref.spaceId, privileges))) {
      throw new WorkflowPagePrivilegesError(operation, privileges);
    }
    await this.deps.assertWorkflowAccess(
      { workflowId: ref.workflowId, spaceId: ref.spaceId },
      PAGE_WORKFLOW_ACCESS_OPERATION,
      request
    );
  }

  private async partialUpdate(
    ref: WorkflowPageRef,
    request: KibanaRequest,
    attributes: { access?: WorkflowPageAccess | null; offline?: boolean },
    audit: (error?: unknown) => void
  ): Promise<WorkflowPageDto> {
    try {
      await this.authorize(ref, request, 'managePage');
      const client = await this.deps.getScopedClient(request);
      const id = getWorkflowPageSavedObjectId(ref);
      const namespace = namespaceOf(ref.spaceId);
      // Reads first, so an update cannot create a page that the lifecycle never made.
      const { version } = await client.get<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        id,
        { namespace }
      );
      await partiallyUpdateWorkflowPage(client, id, attributes, {
        namespace,
        version,
        refresh: 'wait_for',
      });
      audit();
      return this.toDto(await client.get(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id, { namespace }));
    } catch (error) {
      audit(error);
      throw this.toPageError(error, ref);
    }
  }

  private async createPage(
    client: SavedObjectsClientContract,
    ref: WorkflowPageRef
  ): Promise<void> {
    const secret = generatePageSecret();
    try {
      await client.create<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        {
          workflowId: ref.workflowId,
          pageId: ref.pageId,
          secret,
          secretHash: computePageSecretHash(ref, secret),
          access: null,
          offline: false,
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
    client: SavedObjectsClientContract,
    workflowIds: string[],
    spaceId: string
  ): Promise<Array<SavedObject<WorkflowPageAttributes>>> {
    const finder = client.createPointInTimeFinder<WorkflowPageAttributes>({
      type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      namespaces: [spaceId],
      perPage: FIND_PER_PAGE,
      filter: nodeBuilder.or(
        workflowIds.map((workflowId) =>
          nodeBuilder.is(`${WORKFLOW_PAGE_SAVED_OBJECT_TYPE}.attributes.workflowId`, workflowId)
        )
      ),
    });
    const pages: Array<SavedObject<WorkflowPageAttributes>> = [];
    try {
      for await (const response of finder.find()) {
        pages.push(...response.saved_objects);
      }
    } finally {
      await finder.close();
    }
    return pages;
  }

  private async deletePages(
    client: SavedObjectsClientContract,
    pages: Array<SavedObject<WorkflowPageAttributes>>,
    spaceId: string
  ): Promise<void> {
    if (pages.length === 0) {
      return;
    }
    const { statuses } = await client.bulkDelete(
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

  private async getOrUndefined(
    client: SavedObjectsClientContract,
    ref: WorkflowPageRef
  ): Promise<SavedObject<WorkflowPageAttributes> | undefined> {
    try {
      return await client.get<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        getWorkflowPageSavedObjectId(ref),
        { namespace: namespaceOf(ref.spaceId) }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private toDto({
    attributes,
    created_at: createdAt,
    created_by: createdBy,
    updated_at: updatedAt,
    updated_by: updatedBy,
  }: SavedObject<WorkflowPageAttributes>): WorkflowPageDto {
    const { workflowId, pageId, access, offline } = attributes;
    return {
      workflowId,
      pageId,
      access: access ?? null,
      offline,
      online: isOnline(attributes, this.deps.canEncrypt),
      createdAt,
      createdBy,
      updatedAt,
      updatedBy,
    };
  }

  private assertCanEncrypt(): void {
    if (!this.deps.canEncrypt) {
      throw new WorkflowPagesUnavailableError();
    }
  }

  private toPageError(error: unknown, ref: WorkflowPageRef): unknown {
    return error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error)
      ? new WorkflowPageNotFoundError(ref.pageId, ref.workflowId)
      : error;
  }
}
