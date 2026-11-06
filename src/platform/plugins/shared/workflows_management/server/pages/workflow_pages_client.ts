/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import type { WorkflowAccessOperation } from '@kbn/workflows';
import {
  getWorkflowPageSavedObjectId,
  partiallyUpdateWorkflowPage,
  WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
} from './page_saved_object';
import type {
  PartiallyUpdatableWorkflowPageAttributes,
  WorkflowPageAccess,
  WorkflowPageAttributes,
} from './page_saved_object';
import { computePageSecretHash, generatePageSecret } from './page_secret';
import type { WorkflowPageRef } from './page_secret';
import type {
  AssertWorkflowAccess,
  WorkflowPageAuditLog,
  WorkflowPageDto,
  WorkflowPageKey,
  WorkflowPageOperation,
} from './types';
import { getPageOrUndefined, namespaceOf, toPageDto, toPageError } from './utils';
import { WorkflowPageNotFoundError } from './workflow_page_not_found_error';
import { WorkflowPagePrivilegesError } from './workflow_page_privileges_error';
import { WorkflowPagesUnavailableError } from './workflow_pages_unavailable_error';

/**
 * The workflow ACL operation that every page operation needs. Anyone who can run the
 * workflow can serve its page, so disabling a page needs no workflow edit access.
 */
const PAGE_WORKFLOW_ACCESS_OPERATION: WorkflowAccessOperation = 'execute';

/**
 * Page operations for one request, in the request's space.
 * Every method checks the caller's Kibana privileges and the workflow ACL first, so a
 * caller that skips the route checks cannot bypass them.
 */
export interface WorkflowPagesClient {
  get(key: WorkflowPageKey): Promise<WorkflowPageDto>;
  /** Decrypts the secret for the Share link. The only operation that decrypts. */
  getSecret(key: WorkflowPageKey): Promise<string>;
  /** Replaces the secret. The old link fails at once. Returns the new secret. */
  rotateSecret(key: WorkflowPageKey): Promise<string>;
  /** Sets the access level. `null` removes it, which takes the page offline. */
  setAccess(key: WorkflowPageKey, access: WorkflowPageAccess | null): Promise<WorkflowPageDto>;
  /** Enables or disables the page. Needs neither workflow update nor security admin. */
  setEnabled(key: WorkflowPageKey, enabled: boolean): Promise<WorkflowPageDto>;
}

export interface WorkflowPagesClientDeps {
  request: KibanaRequest;
  spaceId: string;
  /** The caller's Kibana privileges per page operation, resolved when the client is built. */
  privileges: Readonly<Record<WorkflowPageOperation, boolean>>;
  canEncrypt: boolean;
  /** Internal client with the page type. Reads use it after the checks. */
  internalClient: SavedObjectsClientContract;
  /** Request-scoped client with the page type. Writes use it, so core sets `updated_by`. */
  scopedClient: SavedObjectsClientContract;
  encryptedClient: EncryptedSavedObjectsClient;
  assertWorkflowAccess: AssertWorkflowAccess;
  audit: WorkflowPageAuditLog;
}

export class WorkflowPagesClientImpl implements WorkflowPagesClient {
  constructor(private readonly deps: WorkflowPagesClientDeps) {}

  async get(key: WorkflowPageKey): Promise<WorkflowPageDto> {
    const ref = this.toRef(key);
    await this.authorize(ref, 'readPage');
    const page = await getPageOrUndefined(this.deps.internalClient, ref);
    if (!page) {
      throw new WorkflowPageNotFoundError(ref.pageId, ref.workflowId);
    }
    return toPageDto(page, this.deps.canEncrypt);
  }

  async getSecret(key: WorkflowPageKey): Promise<string> {
    const ref = this.toRef(key);
    const { request, audit, encryptedClient } = this.deps;
    this.assertCanEncrypt();
    try {
      await this.authorize(ref, 'readPage');
      const { attributes } =
        await encryptedClient.getDecryptedAsInternalUser<WorkflowPageAttributes>(
          WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
          getWorkflowPageSavedObjectId(ref),
          { namespace: namespaceOf(ref.spaceId) }
        );
      audit.logPageLinkRead(request, ref);
      return attributes.secret;
    } catch (error) {
      audit.logPageLinkRead(request, { ...ref, error });
      throw toPageError(error, ref);
    }
  }

  async rotateSecret(key: WorkflowPageKey): Promise<string> {
    const ref = this.toRef(key);
    const { request, audit, scopedClient } = this.deps;
    this.assertCanEncrypt();
    try {
      await this.authorize(ref, 'managePage');
      const id = getWorkflowPageSavedObjectId(ref);
      const namespace = namespaceOf(ref.spaceId);
      const { version } = await scopedClient.get<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        id,
        { namespace }
      );
      const secret = generatePageSecret();
      // Writes the secret with every AAD attribute, so ESO encrypts it with the full AAD.
      // The `version` makes a concurrent rotation fail instead of losing a secret.
      await scopedClient.update<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        id,
        {
          workflowId: ref.workflowId,
          pageId: ref.pageId,
          secret,
          secretHash: computePageSecretHash(ref, secret),
        },
        { namespace, version, refresh: 'wait_for' }
      );
      audit.logPageSecretRotated(request, ref);
      return secret;
    } catch (error) {
      audit.logPageSecretRotated(request, { ...ref, error });
      throw toPageError(error, ref);
    }
  }

  async setAccess(
    key: WorkflowPageKey,
    access: WorkflowPageAccess | null
  ): Promise<WorkflowPageDto> {
    const ref = this.toRef(key);
    return this.partialUpdate(ref, { access }, (error) =>
      this.deps.audit.logPageAccessChanged(this.deps.request, { ...ref, access, error })
    );
  }

  async setEnabled(key: WorkflowPageKey, enabled: boolean): Promise<WorkflowPageDto> {
    const ref = this.toRef(key);
    return this.partialUpdate(ref, { enabled }, (error) =>
      this.deps.audit.logPageEnabledChanged(this.deps.request, { ...ref, enabled, error })
    );
  }

  /**
   * Checks the caller before a page operation, in two steps:
   * 1. Kibana privileges: the role grants the operation in the client's space.
   * 2. Workflow ACL: the user can run this workflow.
   */
  private async authorize(ref: WorkflowPageRef, operation: WorkflowPageOperation): Promise<void> {
    if (!this.deps.privileges[operation]) {
      throw new WorkflowPagePrivilegesError(
        operation,
        WorkflowsManagementOperationPrivileges[operation]
      );
    }
    await this.deps.assertWorkflowAccess(
      { workflowId: ref.workflowId, spaceId: ref.spaceId },
      PAGE_WORKFLOW_ACCESS_OPERATION,
      this.deps.request
    );
  }

  private async partialUpdate(
    ref: WorkflowPageRef,
    attributes: PartiallyUpdatableWorkflowPageAttributes,
    audit: (error?: unknown) => void
  ): Promise<WorkflowPageDto> {
    const { scopedClient, canEncrypt } = this.deps;
    try {
      await this.authorize(ref, 'managePage');
      const id = getWorkflowPageSavedObjectId(ref);
      const namespace = namespaceOf(ref.spaceId);
      // Reads first, so an update cannot create a page that the lifecycle never made.
      const { version } = await scopedClient.get<WorkflowPageAttributes>(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        id,
        { namespace }
      );
      await partiallyUpdateWorkflowPage(scopedClient, id, attributes, {
        namespace,
        version,
        refresh: 'wait_for',
      });
      audit();
      return toPageDto(
        await scopedClient.get<WorkflowPageAttributes>(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id, {
          namespace,
        }),
        canEncrypt
      );
    } catch (error) {
      audit(error);
      throw toPageError(error, ref);
    }
  }

  private toRef({ workflowId, pageId }: WorkflowPageKey): WorkflowPageRef {
    return { workflowId, pageId, spaceId: this.deps.spaceId };
  }

  private assertCanEncrypt(): void {
    if (!this.deps.canEncrypt) {
      throw new WorkflowPagesUnavailableError();
    }
  }
}
