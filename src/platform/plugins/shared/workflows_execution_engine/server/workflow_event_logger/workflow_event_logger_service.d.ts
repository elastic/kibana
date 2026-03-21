import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { ExecutionLogsParams, IWorkflowEventLogger, IWorkflowEventLoggerService, LogsByLevelParams, StepLogsParams, WorkflowEventLoggerContext } from './types';
import type { LogSearchResult, SearchLogsParams } from '../repositories/logs_repository';
export declare class WorkflowEventLoggerService implements IWorkflowEventLoggerService {
    private readonly logger;
    private readonly enableConsoleLogging;
    private logsRepository;
    constructor(dataStreams: DataStreamsStart, logger: Logger, enableConsoleLogging?: boolean);
    createLogger(context: WorkflowEventLoggerContext): IWorkflowEventLogger;
    createWorkflowLogger(workflowId: string, workflowName?: string): IWorkflowEventLogger;
    createExecutionLogger(workflowId: string, executionId: string, workflowName?: string): IWorkflowEventLogger;
    createStepLogger(workflowId: string, executionId: string, stepId: string, stepName?: string, stepType?: string, workflowName?: string): IWorkflowEventLogger;
    private transformPaginationParams;
    getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult>;
    getStepLogs(params: StepLogsParams): Promise<LogSearchResult>;
    getLogsByLevel(params: LogsByLevelParams): Promise<LogSearchResult>;
    searchLogs(params: SearchLogsParams): Promise<LogSearchResult>;
    getRecentLogs(limit?: number): Promise<LogSearchResult>;
}
