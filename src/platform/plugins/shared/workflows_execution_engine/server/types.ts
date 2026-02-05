/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { IWorkflowEventLoggerService } from './workflow_event_logger';

export interface ExecuteWorkflowResponse {
  workflowExecutionId: string;
}

export interface ExecuteWorkflowStepResponse {
  workflowExecutionId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExecutionEnginePluginSetup {}
export interface WorkflowsExecutionEnginePluginStart {
  executeWorkflow: ExecuteWorkflow;
  executeWorkflowStep: ExecuteWorkflowStep;
  cancelWorkflowExecution: CancelWorkflowExecution;
  workflowEventLoggerService: IWorkflowEventLoggerService;
  scheduleWorkflow: ScheduleWorkflow;
}

export interface WorkflowsExecutionEnginePluginSetupDeps {
  taskManager: TaskManagerSetupContract;
  cloud: CloudSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  actions: ActionsPluginStartContract;
  cloud: CloudStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  licensing: LicensingPluginStart;
}

export type ExecuteWorkflow = (
  workflow: WorkflowExecutionEngineModel,
  context: Record<string, any>,
  request: KibanaRequest
) => Promise<ExecuteWorkflowResponse>;

export type ExecuteWorkflowStep = (
  workflow: WorkflowExecutionEngineModel,
  stepId: string,
  contextOverride: Record<string, any>,
  request: KibanaRequest
) => Promise<ExecuteWorkflowStepResponse>;

export type CancelWorkflowExecution = (
  workflowExecutionId: string,
  spaceId: string
) => Promise<void>;

export type ScheduleWorkflow = (
  workflow: WorkflowExecutionEngineModel,
  context: Record<string, any>,
  request: KibanaRequest
) => Promise<ExecuteWorkflowResponse>;
