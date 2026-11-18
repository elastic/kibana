/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { WorkflowsExecutionEnginePlugin } = await import('./plugin');
  return new WorkflowsExecutionEnginePlugin(initializerContext);
}

export { initializeDataStreamDataClients } from './repositories/data_access_layer/implementations/data_stream/data_stream_data_client_bundle';
export { createPlainIndexDataClients } from './repositories/data_access_layer/implementations/plain_index/plain_index_data_client_bundle';
export { createWorkflowScheduler } from './create_workflow_scheduler';
export type {
  WorkflowScheduler,
  WorkflowSchedulerDeps,
  WorkflowSchedulerTaskManager,
} from './create_workflow_scheduler';
export { createWorkflowRuntime } from './create_workflow_runtime';
export type {
  WorkflowRuntime,
  WorkflowRuntimeDeps,
  WorkflowRuntimeState,
  WorkflowTaskContext,
  WorkflowTaskFunction,
} from './create_workflow_runtime';
export type {
  WorkflowCloudInfo,
  WorkflowCoreStart,
  WorkflowDataStreamsAdapter,
  WorkflowRuntimeTaskManager,
} from './workflow_core_services';
export { getWorkflowDataStreamDefinitions, registerWorkflowDataStreams } from './data_streams';
export {
  assertRunnableInProcess,
  assertRunnableInProcessPreflight,
  collectWorkflowRequirements,
  findMissingWorkflowCapabilities,
} from './lib/assert_runnable_in_process';
export type {
  MissingWorkflowCapabilities,
  WorkflowPreflight,
  WorkflowPreflightContext,
  WorkflowRequirements,
  WorkflowRunCapabilities,
} from './lib/assert_runnable_in_process';
export { buildWorkflowMeteringRecord, createWorkflowsMeteringReporter } from './metering';
export type { MeteringSink, WorkflowMeteringRecord } from './metering';
export { ExecutionIdentityContexts } from './service_account_execution';
export { HitlLifecycleAuditRegistry } from './step/wait_for_input_step/hitl_lifecycle_auditor';
export type { WorkflowsExecutionEngineConfig } from './config';
export { WORKFLOWS_EXECUTION_ENGINE_TASK_PROCESS_SETTINGS_ID } from './task_process_settings';

export type {
  DataClient,
  GetStepExecutionsByIdsOptions,
  GetWorkflowExecutionsByIdsOptions,
  StepExecutionsDataClient,
  TriggerEventsContract,
  WorkflowExecutionsDataClient,
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginStart,
} from './types';

export { getStepExecutionsByWorkflowExecution } from './repositories/data_access_layer/lib/get_step_executions_by_workflow_execution';
export { getBulkUpdaterWriteResult } from './repositories/data_access_layer/lib/bulk/bulk_updater_write_result';
export type { BulkUpdaterWriteResult } from './repositories/data_access_layer/lib/bulk/bulk_updater_write_result';
export { bulkUpdaterItem } from './repositories/data_access_layer/types';

export {
  registerHitlLifecycleAuditor,
  type HitlLifecycleAuditor,
  type HitlLifecycleEvent,
} from './step/wait_for_input_step/hitl_lifecycle_auditor';

export type {
  LogsRepository,
  WorkflowLogEvent,
  LogSearchResult,
  SearchLogsParams,
} from './repositories/logs_repository';

export type { IWorkflowLogsQueryService } from './workflow_event_logger';

export { resolveWorkflowEventsModeFromOn } from './trigger_events/lib/resolve_workflow_events_mode_from_on';

export type {
  SearchTriggerEventLogHit,
  SearchTriggerEventLogParams,
  SearchTriggerEventLogResult,
} from './trigger_events/event_logs/trigger_event_log_query';

export {
  resolveWorkflowTaskPacks,
  WORKFLOWS_TASK_SCHEDULING_PACK_ID,
} from './lib/get_workflow_task_packs';
export type { WorkflowTaskPacksTaskManager } from './lib/get_workflow_task_packs';
export { WORKFLOW_SCHEDULED_TASK_TYPE } from './workflow_task_manager/types';
