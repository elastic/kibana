import type { Logger } from '@kbn/core/server';
import type { IWorkflowEventLogger, WorkflowEventLoggerContext, WorkflowEventLoggerOptions } from './types';
import type { LogsRepository, WorkflowLogEvent } from '../repositories/logs_repository';
export declare class WorkflowEventLogger implements IWorkflowEventLogger {
    private logsRepository;
    private logger;
    private context;
    private options;
    private eventQueue;
    private timings;
    constructor(logsRepository: LogsRepository, logger: Logger, context?: WorkflowEventLoggerContext, options?: WorkflowEventLoggerOptions);
    logEvent(eventProperties: Partial<WorkflowLogEvent>): void;
    logInfo(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
    logError(message: string, error?: Error, additionalData?: Partial<WorkflowLogEvent>): void;
    logWarn(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
    logDebug(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
    startTiming(event: WorkflowLogEvent): void;
    stopTiming(event: WorkflowLogEvent): void;
    createStepLogger(stepExecutionId: string, stepId: string, stepName?: string, stepType?: string): IWorkflowEventLogger;
    private createBaseEvent;
    private logToConsole;
    private getTimingKey;
    private queueEvent;
    flushEvents(): Promise<void>;
}
