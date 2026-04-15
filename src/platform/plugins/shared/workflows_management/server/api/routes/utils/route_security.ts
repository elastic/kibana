/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

/**
 * Security configuration objects ready to be used in route definitions.
 *
 * Privilege model:
 * - Routes that return workflow data to the caller require `read`.
 * - Routes that return execution data require `readExecution`.
 * - Mutating routes (update / delete) perform internal reads as part of the
 *   write operation (merge, space-scoping). These reads are implementation
 *   details and do NOT require the `read` privilege.
 * - `get_workflows` and `get_stats` conditionally include execution data when
 *   the user also holds `readExecution` (checked at runtime via `authzResult`).
 */
export const WORKFLOW_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.read] },
};
/**
 * This security configuration allows either `read` or `readExecution` privilege.
 * This is used to include optional `readExecution` privilege.
 * The `read` privilege needs to be checked explicitly in the route handler to enforce it.
 */
export const WORKFLOW_READ_OR_READ_EXECUTIONS_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: [
          WorkflowsManagementApiActions.read,
          WorkflowsManagementApiActions.readExecution,
        ],
      },
    ],
  },
};
export const WORKFLOW_CREATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.create] },
};
export const WORKFLOW_CLONE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [WorkflowsManagementApiActions.create, WorkflowsManagementApiActions.read],
  },
};
export const WORKFLOW_BULK_CREATE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [
      WorkflowsManagementApiActions.create,
      WorkflowsManagementApiActions.update,
    ],
  },
};
export const WORKFLOW_UPDATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.update] },
};
export const WORKFLOW_DELETE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.delete] },
};
export const WORKFLOW_EXECUTE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [WorkflowsManagementApiActions.execute, WorkflowsManagementApiActions.read],
  },
};
export const WORKFLOW_EXECUTION_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.readExecution] },
};
export const WORKFLOW_EXECUTION_CANCEL_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.cancelExecution] },
};
export const WORKFLOW_EXECUTION_RESUME_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.execute] },
};
