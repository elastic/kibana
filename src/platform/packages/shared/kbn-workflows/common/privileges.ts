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
  'readManaged' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:managed:read`,
  'update' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:update`,
  'updateManaged' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:managed:update`,
  'delete' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:delete`,
  'execute' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:execute`,
  'readExecution' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:readExecution`,
  'readManagedExecution' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:managed:readExecution`,
  'cancelExecution' = `${WORKFLOWS_MANAGEMENT_FEATURE_ID}:cancelExecution`,
}

/**
 * The API actions required to perform each Workflows Management operation, and the single source of
 * truth for every consumer: the Workflows Management HTTP routes, and the plugins that perform the
 * same operations through the server-side API (Agent Builder) and check the privileges themselves.
 *
 * All the actions listed for an operation are required (AND).
 *
 * Only the actions the operation itself requires are listed. Reads performed as an implementation
 * detail of an operation (e.g. loading a workflow document before executing it) do not expose data
 * to the caller, so they do not require the `read` action.
 *
 * The managed variants are supersets: reading a managed workflow requires the base `read` action on
 * top of the managed one.
 */
export const WorkflowsManagementOperationPrivileges = {
  create: [WorkflowsManagementApiActions.create],
  clone: [WorkflowsManagementApiActions.create, WorkflowsManagementApiActions.read],
  bulkCreate: [WorkflowsManagementApiActions.create, WorkflowsManagementApiActions.update],
  read: [WorkflowsManagementApiActions.read],
  readManaged: [WorkflowsManagementApiActions.read, WorkflowsManagementApiActions.readManaged],
  update: [WorkflowsManagementApiActions.update],
  updateManaged: [
    WorkflowsManagementApiActions.update,
    WorkflowsManagementApiActions.updateManaged,
  ],
  delete: [WorkflowsManagementApiActions.delete],
  execute: [WorkflowsManagementApiActions.execute],
  // Resuming acts on an execution that is already running, so it rides on `execute` until the
  // resume-specific privilege model is defined.
  resumeExecution: [WorkflowsManagementApiActions.execute],
  // `readExecution` is an extension of `read`: reading execution details also requires read access
  // to the workflow definition (the executed YAML snapshot is part of the execution document).
  readExecution: [WorkflowsManagementApiActions.read, WorkflowsManagementApiActions.readExecution],
  readManagedExecution: [
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.readExecution,
    WorkflowsManagementApiActions.readManagedExecution,
  ],
  cancelExecution: [WorkflowsManagementApiActions.cancelExecution],
} as const satisfies Record<string, readonly WorkflowsManagementApiActions[]>;

// The UI actions (aka capabilities) added by feature privileges, to be checked in the UI components.
// UI actions are scoped by feature ID ("workflowsManagement"), so no need to add any prefix.
// example: application.capabilities.workflowsManagement.createWorkflow
export enum WorkflowsManagementUiActions {
  'create' = 'createWorkflow',
  'read' = 'readWorkflow',
  'readManaged' = 'readManagedWorkflow',
  'update' = 'updateWorkflow',
  'delete' = 'deleteWorkflow',
  'execute' = 'executeWorkflow',
  'readExecution' = 'readWorkflowExecution',
  'readManagedExecution' = 'readManagedWorkflowExecution',
  'cancelExecution' = 'cancelWorkflowExecution',
}
