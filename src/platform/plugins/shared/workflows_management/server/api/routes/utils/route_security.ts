/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import {
  WorkflowsManagementApiActions,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import { ManagedWorkflowExecutionReadForbiddenError } from '../../managed_workflow_execution_read_error';
import { ManagedWorkflowReadForbiddenError } from '../../managed_workflow_read_error';
import type { GetWorkflowsParams } from '../../workflows_management_api';

interface AuthzRequest {
  authzResult?: Record<string, boolean>;
}

interface ManagedResource {
  managed?: boolean;
}

/**
 * Security configuration objects ready to be used in route definitions.
 *
 * The privileges each operation requires are defined in
 * `WorkflowsManagementOperationPrivileges` (`@kbn/workflows`), shared with the other plugins that
 * perform the same operations through the server-side API. These objects only add the
 * route-specific composition on top (`anyRequired` / `extendedPrivileges`).
 *
 * Privilege model:
 * - Routes that return workflow data to the caller require `read`.
 * - Execution routes require `readExecution`. Callers who also hold `read` receive the full
 *   `WorkflowExecutionDto` (which includes the YAML snapshot and step executions); callers with
 *   only `readExecution` receive a narrow `WorkflowExecutionSummaryDto` (status, timing, who ran
 *   it — no definition data). `read` is surfaced via `extendedPrivileges` so handlers can branch
 *   on `authzResult.read` without it becoming a hard gate.
 * - Routes that mutate or execute perform internal reads as part of the operation
 *   (merge, space-scoping, loading the definition to run it). These reads are
 *   implementation details and do NOT require the `read` privilege.
 * - `get_workflows` and `get_stats` use `extendedPrivileges` for optional
 *   execution/managed privileges checked via `authzResult` without gating access.
 */
export const WORKFLOW_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.read] },
};
/**
 * Allows either base read or managed read through platform authz so handlers can
 * inspect `authzResult` for both. Handlers must still require base `read`.
 */
export const WORKFLOW_READ_WITH_MANAGED_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [{ anyRequired: [...WorkflowsManagementOperationPrivileges.readManaged] }],
  },
};
/**
 * Requires `read`, and surfaces optional execution/managed privileges in
 * `authzResult` without enforcing them. Used by list/stats routes that may
 * include execution history when the caller also holds those privileges.
 */
export const WORKFLOW_READ_WITH_EXECUTION_EXTENDED_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [...WorkflowsManagementOperationPrivileges.read],
    extendedPrivileges: [
      WorkflowsManagementApiActions.readManaged,
      WorkflowsManagementApiActions.readExecution,
      WorkflowsManagementApiActions.readManagedExecution,
    ],
  },
};
export const WORKFLOW_CREATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.create] },
};
export const WORKFLOW_CLONE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.clone] },
};
export const WORKFLOW_BULK_CREATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.bulkCreate] },
};
export const WORKFLOW_UPDATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.update] },
};
export const WORKFLOW_MANAGED_UPDATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.updateManaged] },
};
export const WORKFLOW_DELETE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.delete] },
};
export const WORKFLOW_EXECUTE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.execute] },
};
export const WORKFLOW_EXECUTION_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.readExecution] },
};
/**
 * Requires `readExecution` and surfaces `read` and `readManagedExecution` as optional
 * privileges in `authzResult` without enforcing them as hard gates.
 *
 * Handlers branch on `authzResult.read` to decide the response shape:
 * - `read` present → full `WorkflowExecutionDto` (includes yaml snapshot and step executions)
 * - `read` absent  → narrow `WorkflowExecutionSummaryDto` (status, timing, who ran it)
 *
 * Handlers branch on `authzResult.readManagedExecution` to decide managed-execution access.
 */
export const WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [...WorkflowsManagementOperationPrivileges.readExecution],
    extendedPrivileges: [
      WorkflowsManagementApiActions.read,
      WorkflowsManagementApiActions.readManagedExecution,
    ],
  },
};
export const WORKFLOW_EXECUTION_CANCEL_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.cancelExecution] },
};
export const WORKFLOW_EXECUTION_RESUME_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.resumeExecution] },
};

const hasPrivilege = (request: AuthzRequest, action: WorkflowsManagementApiActions): boolean =>
  request.authzResult?.[action] === true;

export const hasWorkflowReadPrivilege = (request: AuthzRequest): boolean =>
  hasPrivilege(request, WorkflowsManagementApiActions.read);

export const hasWorkflowExecutionReadPrivilege = (request: AuthzRequest): boolean =>
  hasPrivilege(request, WorkflowsManagementApiActions.readExecution);

export const canReadManagedWorkflows = (request: AuthzRequest): boolean =>
  hasWorkflowReadPrivilege(request) &&
  hasPrivilege(request, WorkflowsManagementApiActions.readManaged);

export const canReadManagedWorkflowExecutions = (request: AuthzRequest): boolean =>
  hasWorkflowExecutionReadPrivilege(request) &&
  hasPrivilege(request, WorkflowsManagementApiActions.readManagedExecution);

export const resolveAuthorizedManagedFilter = (
  request: AuthzRequest,
  requested?: GetWorkflowsParams['managedFilter']
): GetWorkflowsParams['managedFilter'] => {
  if ((requested === 'managed' || requested === 'all') && !canReadManagedWorkflows(request)) {
    throw new ManagedWorkflowReadForbiddenError();
  }

  return requested ?? 'unmanaged';
};

export const assertCanReadManagedWorkflow = (
  request: AuthzRequest,
  workflow: ManagedResource | null | undefined
): void => {
  if (workflow?.managed === true && !canReadManagedWorkflows(request)) {
    throw new ManagedWorkflowReadForbiddenError();
  }
};

export const assertCanReadManagedWorkflowExecution = (
  request: AuthzRequest,
  execution: ManagedResource | null | undefined
): void => {
  if (execution?.managed === true && !canReadManagedWorkflowExecutions(request)) {
    throw new ManagedWorkflowExecutionReadForbiddenError();
  }
};
