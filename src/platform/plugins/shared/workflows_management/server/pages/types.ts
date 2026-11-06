/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowAccessOperation } from '@kbn/workflows';
import type { WorkflowPageAccess } from './page_saved_object';
import type { WorkflowPageRef } from './page_secret';

/** What callers see of a page. Never holds the secret or its hash. */
export interface WorkflowPageDto {
  workflowId: string;
  pageId: string;
  access: WorkflowPageAccess | null;
  /** The page switch. A disabled page is offline while its workflow keeps running. */
  enabled: boolean;
  /** True when the public route serves the page. */
  online: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** A page in the client's space. The space comes from the request. */
export type WorkflowPageKey = Omit<WorkflowPageRef, 'spaceId'>;

/** The page operations, keyed like `WorkflowsManagementOperationPrivileges`. */
export type WorkflowPageOperation = 'readPage' | 'managePage';

export type WorkflowPageAuditParams = WorkflowPageRef & { error?: unknown };

/** The audit events of page operations. Workflow saves and deletes audit the lifecycle. */
export interface WorkflowPageAuditLog {
  logPageLinkRead(request: KibanaRequest, params: WorkflowPageAuditParams): void;
  logPageSecretRotated(request: KibanaRequest, params: WorkflowPageAuditParams): void;
  logPageAccessChanged(
    request: KibanaRequest,
    params: WorkflowPageAuditParams & { access: WorkflowPageAccess | null }
  ): void;
  logPageEnabledChanged(
    request: KibanaRequest,
    params: WorkflowPageAuditParams & { enabled: boolean }
  ): void;
}

/** Throws when the workflow is missing or its ACL denies the operation to the caller. */
export type AssertWorkflowAccess = (
  workflow: { workflowId: string; spaceId: string },
  operation: WorkflowAccessOperation,
  request: KibanaRequest
) => Promise<void>;
