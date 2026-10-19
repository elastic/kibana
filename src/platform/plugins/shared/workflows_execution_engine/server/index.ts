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

export type {
  DailyExecutionCount,
  ExecutionReadDeps,
  ExecutionStepsPage,
  ExecutionTimeRange,
  ExecutionVisibility,
  GetChildExecutionsParams,
  GetDailyExecutionCountsParams,
  GetExecutionParams,
  GetExecutionStepsParams,
  GetStepExecutionsByIdsParams,
  GetStepFacetsParams,
  GetStepParams,
  GetWaitingStepIdParams,
  GetWorkflowExecutionsByIdParams,
  HasNonTerminalExecutionParams,
  SearchExecutionsParams,
  SearchExecutionViewParams,
  SearchStepsParams,
  StepFacetCounts,
  StepFacetField,
  StepSearchCriteria,
  StepSettlement,
  StepSort,
  WorkflowExecutionRead,
  WorkflowExecutionReadApi,
} from './public_api/types';
export { ExecutionSearchIncompleteError } from './public_api/types';
export { getChildExecutions } from './public_api/get_child_executions';
export { getDailyExecutionCounts } from './public_api/get_daily_execution_counts';
export { getExecution } from './public_api/get_execution';
export { getExecutionSteps } from './public_api/get_execution_steps';
export { getStep } from './public_api/get_step';
export { getStepExecutionsByIds } from './public_api/get_step_executions_by_ids';
export { getStepFacets } from './public_api/get_step_facets';
export { getWaitingStepId } from './public_api/get_waiting_step_id';
export { getWorkflowExecutionsById } from './public_api/get_workflow_executions_by_id';
export { hasNonTerminalExecution } from './public_api/has_non_terminal_execution';
export { searchExecutionView } from './public_api/search_execution_view';
export { searchExecutions } from './public_api/search_executions';
export { searchSteps } from './public_api/search_steps';
export { isWorkflowVisible } from './public_api/lib/query';
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
