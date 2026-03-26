/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from './constants';

// The API actions added by feature privileges, to be checked in the API routes.
// Api actions are not scoped by feature ID, so we scope it by adding the feature ID ("workflowsManagement") as prefix.
// example: security.authz.requiredPrivileges: ["workflowsManagement:create"]
export enum WorkflowsManagementApiActions {
  'create' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:create`,
  'read' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:read`,
  'update' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:update`,
  'delete' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:delete`,
  'execute' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:execute`,
  'readExecution' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:readExecution`,
  'cancelExecution' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:cancelExecution`,
}

// The UI actions (aka capabilities) added by feature privileges, to be checked in the UI components.
// UI actions are scoped by feature ID ("workflowsManagement"), so no need to add any prefix.
// example: application.capabilities.workflowsManagement.createWorkflow
export enum WorkflowsManagementUiActions {
  'create' = 'createWorkflow',
  'read' = 'readWorkflow',
  'update' = 'updateWorkflow',
  'delete' = 'deleteWorkflow',
  'execute' = 'executeWorkflow',
  'readExecution' = 'readWorkflowExecution',
  'cancelExecution' = 'cancelWorkflowExecution',
}
