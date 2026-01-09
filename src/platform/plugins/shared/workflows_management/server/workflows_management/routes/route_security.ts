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
 * Security configuration objects ready to be used in route definitions
 */
export const WORKFLOW_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.read] },
};
export const WORKFLOW_CREATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.create] },
};
export const WORKFLOW_UPDATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.update] },
};
export const WORKFLOW_DELETE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.delete] },
};
export const WORKFLOW_EXECUTE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.execute] },
};
export const WORKFLOW_EXECUTION_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.readExecution] },
};
export const WORKFLOW_EXECUTION_CANCEL_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.cancelExecution] },
};
