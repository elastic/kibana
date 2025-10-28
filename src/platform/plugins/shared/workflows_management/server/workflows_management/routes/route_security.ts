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
export const SecurityRead: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.read] },
};
export const SecurityCreate: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.create] },
};
export const SecurityUpdate: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.update] },
};
export const SecurityDelete: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.delete] },
};
export const SecurityExecute: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.execute] },
};
export const SecurityReadExecution: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.readExecution] },
};
export const SecurityCancelExecution: RouteSecurity = {
  authz: { requiredPrivileges: [WorkflowsManagementApiActions.cancelExecution] },
};
