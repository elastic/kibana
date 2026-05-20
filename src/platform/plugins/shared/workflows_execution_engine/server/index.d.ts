import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").WorkflowsExecutionEnginePlugin>;
export type { WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart, } from './types';
export type { LogsRepository, WorkflowLogEvent, LogSearchResult, SearchLogsParams, } from './repositories/logs_repository';
export type { IWorkflowEventLoggerService } from './workflow_event_logger';
export { resolveWorkflowEventsModeFromOn } from './trigger_events/lib/resolve_workflow_events_mode_from_on';
