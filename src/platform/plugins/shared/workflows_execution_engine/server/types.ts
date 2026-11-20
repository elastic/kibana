/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type { DataViewsServerPluginSetup } from '@kbn/data-views-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { IEventLogService } from '@kbn/event-log-plugin/server';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { TaskTypeModule } from '@kbn/task-manager-plugin/server/task_type_module';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { UsageApiSetup } from '@kbn/usage-api-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { BulkScheduleWorkflowResult, WorkflowExecutionEngineModel } from '@kbn/workflows';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
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
}

export interface ExecuteWorkflowStepResponse {
  workflowExecutionId: string;
}

/** Engine contract for `resumeWorkflowExecution` (same shape as `@kbn/workflows` `ResumeWorkflowExecutionResponseDto`). */
export interface ResumeWorkflowExecutionResponse {
  resumedBy: string;
}

export interface RegisterHostedTaskTypeOptions {
  /**
   * What the module reads as `host.plugins[id]` when it runs in Kibana (merged, not replacing, the
   * three native workflow task types' own `host.plugins.workflowsExecutionEngine`). A task process
   * instead gets the `start` contracts of the module's own `taskPlugins`, as for every task type
   * module; this is a Kibana-only shortcut the caller's runner may use instead of building the
   * engine's process runtime (`defineWorkflowHostedTaskType`'s `getProcessRuntime`).
   */
  plugins?: () => Promise<Record<string, unknown>>;
}

export interface WorkflowsExecutionEnginePluginSetup {
  /**
   * Registers a task type module built with `defineWorkflowHostedTaskType` (one that reuses this
   * engine's `workflow-steps` and `agent-builder` contributions and process services without being
   * one of the three native workflow task types, such as an agent builder run): the same dispatch
   * settings, parity ids, encryption keys, event log and task plugins a workflow worker is sent.
   */
  registerHostedTaskType: (module: TaskTypeModule, options?: RegisterHostedTaskTypeOptions) => void;
  // Extend this interface when other plugins need to configure the engine during setup.
  [key: string]: unknown;
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
}

export interface WorkflowsExecutionEnginePluginSetupDeps {
  dataViews?: Pick<DataViewsServerPluginSetup, 'getTaskProcessSettings'>;
  data?: DataPluginSetup;
  /**
   * Optional: the config a task process reads when it schedules workflows is registered with it,
   * so rule types that schedule workflows can run in a task process.
   */
  alerting?: AlertingServerSetup;
  fieldsMetadata?: Pick<FieldsMetadataServerSetup, 'getTaskProcessSettings'>;
  taskManager: TaskManagerSetupContract;
  licensing?: LicensingPluginSetup;
  cloud: CloudSetup;
  usageApi?: UsageApiSetup;
  /** Optional: the opt-in, labels and endpoint a task process ships analytics events with. */
  telemetry?: TelemetryPluginSetup;
  /** Optional: how a task process counts and stores usage counters. */
  usageCollection?: UsageCollectionSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  /** What the task process of the workflow task types is given: the actions config, the keys to decrypt with, the event log and the security settings. */
  actions?: ActionsPluginSetupContract;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  eventLog?: IEventLogService;
  security?: SecurityPluginSetup;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  data?: DataPluginStart;
  taskManager: TaskManagerStartContract;
  actions: ActionsPluginStartContract;
  cloud: CloudStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  licensing: LicensingPluginStart;
  spaces?: SpacesPluginStart;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
}

export type ExecuteWorkflow = (
  workflow: WorkflowExecutionEngineModel,
  context: Record<string, unknown>,
  request: KibanaRequest
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
  request: KibanaRequest
) => Promise<ExecuteWorkflowResponse>;

export type BulkScheduleWorkflow = (
  items: Array<{ workflow: WorkflowExecutionEngineModel; context: Record<string, unknown> }>,
  request: KibanaRequest
) => Promise<BulkScheduleWorkflowResult>;
