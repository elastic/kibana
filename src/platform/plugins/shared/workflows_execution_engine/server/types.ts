/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageApiSetup } from '@kbn/usage-api-plugin/server';
import type {
  BulkScheduleWorkflowResult,
  ExecutionLabelsInput,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { ExecutionRetention } from './lib/execution_retention';
import type { UpdateExecutionLabels } from './lib/update_execution_labels';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from './repositories/data_access_layer';
import type {
  SearchTriggerEventLogParams,
  SearchTriggerEventLogResult,
} from './trigger_events/event_logs/trigger_event_log_query';
import type { EmitEvent } from './trigger_events/trigger_event_handler';
import type { IWorkflowLogsQueryService } from './workflow_event_logger';

export type {
  DataClient,
  GetStepExecutionsByIdsOptions,
  GetWorkflowExecutionsByIdsOptions,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from './repositories/data_access_layer';

export interface ExecuteWorkflowResponse {
  workflowExecutionId: string;
  /** True when a deterministic execution id already existed; nothing was scheduled. */
  reusedExisting?: boolean;
}

export interface ExecuteWorkflowStepResponse {
  workflowExecutionId: string;
}

/** Engine contract for `resumeWorkflowExecution` (same shape as `@kbn/workflows` `ResumeWorkflowExecutionResponseDto`). */
export interface ResumeWorkflowExecutionResponse {
  resumedBy: string;
}

export interface WorkflowsExecutionEnginePluginSetup {
  /**
   * Registers an execution label namespace (the key segment before the first dot) to its owning
   * plugin. Only that owner may write keys in the namespace. Re-registering the same pair is a
   * no-op; registering a namespace owned by another plugin throws.
   */
  registerExecutionLabelNamespace: (namespace: string, ownerId: string) => void;
}

/** In-process create options for labelled executions; never accepted from public HTTP callers. */
export interface ExecutionLabelOptions {
  /**
   * Deterministic execution id. Requires labels: an existing execution is reused only when its
   * space, workflow and the supplied labels (its immutable identity) match.
   */
  executionId?: string;
  labels?: ExecutionLabelsInput;
  /** Plugin id that owns every label namespace used in `labels`. Required with labels. */
  labelOwnerId?: string;
}

export interface TriggerEventsContract {
  emitEvent: EmitEvent;
  isEnabled: boolean;
  isLogEventsEnabled: boolean;
  maxEventChainDepth: number;
  searchTriggerEventLog: (
    params: SearchTriggerEventLogParams
  ) => Promise<SearchTriggerEventLogResult>;
}

export interface WorkflowsExecutionEnginePluginStart {
  serviceAccountBindings: Pick<
    CoreStart['security']['serviceAccounts'],
    'isEnabled' | 'bindWorkload' | 'unbindWorkload' | 'getWorkloadBinding'
  >;
  __internalStorage: {
    workflowExecutionsDataClient: WorkflowExecutionsDataClient;
    stepExecutionsDataClient: StepExecutionsDataClient;
  };
  executeWorkflow: ExecuteWorkflow;
  executeWorkflowStep: ExecuteWorkflowStep;
  cancelWorkflowExecution: CancelWorkflowExecution;
  cancelAllActiveWorkflowExecutions: CancelAllActiveWorkflowExecutions;
  resumeWorkflowExecution: ResumeWorkflowExecution;
  workflowEventLoggerService: IWorkflowLogsQueryService;
  scheduleWorkflow: ScheduleWorkflow;
  bulkScheduleWorkflow: BulkScheduleWorkflow;
  triggerEvents: TriggerEventsContract;
  /** Internal: merges owner-checked labels onto an existing execution with optimistic concurrency. */
  updateExecutionLabels: UpdateExecutionLabels;
  /** How long executions are kept, derived from the storage configuration. */
  executionRetention: ExecutionRetention;
}

export interface WorkflowsExecutionEnginePluginSetupDeps {
  taskManager: TaskManagerSetupContract;
  cloud: CloudSetup;
  usageApi?: UsageApiSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  actions: ActionsPluginStartContract;
  cloud: CloudStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  licensing: LicensingPluginStart;
  spaces?: SpacesPluginStart;
}

export type ExecuteWorkflow = (
  workflow: WorkflowExecutionEngineModel,
  context: Record<string, unknown>,
  request: KibanaRequest,
  labelOptions?: ExecutionLabelOptions
) => Promise<ExecuteWorkflowResponse>;

export type ExecuteWorkflowStep = (
  workflow: WorkflowExecutionEngineModel,
  stepId: string,
  executionContext: Record<string, unknown> | undefined,
  contextOverride: Record<string, unknown>,
  request: KibanaRequest
) => Promise<ExecuteWorkflowStepResponse>;

export type CancelWorkflowExecution = (
  workflowExecutionId: string,
  spaceId: string,
  schedulingRequest: KibanaRequest
) => Promise<void>;

export type CancelAllActiveWorkflowExecutions = (params: {
  spaceId: string;
  workflowId: string;
  schedulingRequest: KibanaRequest;
  /**
   * Invoked for each successfully cancelled execution as paging proceeds.
   * Prefer this over accumulating ids so callers (e.g. per-execution audit)
   * never retain an unbounded list in memory.
   */
  onCancelled?: (executionId: string) => void;
}) => Promise<void>;

/**
 * Stores the response of an execution waiting for input and hands it to Task Manager. With a
 * request, a handoff that keeps failing is reverted and rejected with
 * `WorkflowResumeNotAppliedError`, as are failures before anything is written, so the caller can
 * release its claim on the waiting step. Any other rejection may have left the response pending.
 */
export type ResumeWorkflowExecution = (
  executionId: string,
  spaceId: string,
  input: Record<string, unknown>,
  request?: KibanaRequest,
  options?: {
    resumedBy?: string;
  }
) => Promise<ResumeWorkflowExecutionResponse>;

export type InternalResumeWorkflowExecution = (
  executionId: string,
  spaceId: string,
  context: Record<string, unknown> | undefined,
  request?: KibanaRequest,
  options?: { isUserInteractive?: boolean }
) => Promise<void>;

export type ScheduleWorkflow = (
  workflow: WorkflowExecutionEngineModel,
  context: Record<string, unknown>,
  request: KibanaRequest,
  options?: { authenticatedUser?: string } & ExecutionLabelOptions
) => Promise<ExecuteWorkflowResponse>;

export type BulkScheduleWorkflow = (
  items: Array<{
    workflow: WorkflowExecutionEngineModel;
    context: Record<string, unknown>;
    labels?: ExecutionLabelsInput;
    labelOwnerId?: string;
  }>,
  request: KibanaRequest
) => Promise<BulkScheduleWorkflowResult>;
