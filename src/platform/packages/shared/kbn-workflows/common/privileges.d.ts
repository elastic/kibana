/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare enum WorkflowsManagementApiActions {
  'create' = 'workflowsManagement:create',
  'read' = 'workflowsManagement:read',
  'readManaged' = 'workflowsManagement:managed:read',
  'update' = 'workflowsManagement:update',
  'updateManaged' = 'workflowsManagement:managed:update',
  'delete' = 'workflowsManagement:delete',
  'execute' = 'workflowsManagement:execute',
  'readExecution' = 'workflowsManagement:readExecution',
  'readManagedExecution' = 'workflowsManagement:managed:readExecution',
  'cancelExecution' = 'workflowsManagement:cancelExecution',
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
export declare const WorkflowsManagementOperationPrivileges: {
  readonly create: readonly [WorkflowsManagementApiActions.create];
  readonly clone: readonly [
    WorkflowsManagementApiActions.create,
    WorkflowsManagementApiActions.read
  ];
  readonly bulkCreate: readonly [
    WorkflowsManagementApiActions.create,
    WorkflowsManagementApiActions.update
  ];
  readonly read: readonly [WorkflowsManagementApiActions.read];
  readonly readManaged: readonly [
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.readManaged
  ];
  readonly update: readonly [WorkflowsManagementApiActions.update];
  readonly updateManaged: readonly [
    WorkflowsManagementApiActions.update,
    WorkflowsManagementApiActions.updateManaged
  ];
  readonly delete: readonly [WorkflowsManagementApiActions.delete];
  readonly execute: readonly [WorkflowsManagementApiActions.execute];
  readonly resumeExecution: readonly [WorkflowsManagementApiActions.execute];
  readonly readExecution: readonly [
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.readExecution
  ];
  readonly readManagedExecution: readonly [
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.readExecution,
    WorkflowsManagementApiActions.readManagedExecution
  ];
  readonly cancelExecution: readonly [WorkflowsManagementApiActions.cancelExecution];
};
export declare enum WorkflowsManagementUiActions {
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
