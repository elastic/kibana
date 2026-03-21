import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
import type { IDataStreamClient } from '@kbn/data-streams';
import type { GetFieldsOf } from '@kbn/es-mappings';
export declare const initializeLogsRepositoryDataStream: (coreDataStreams: DataStreamsSetup) => void;
declare const logsRepositoryMappings: {
    dynamic: false;
    properties: {
        '@timestamp': import("@kbn/es-mappings").DateMapping;
        spaceId: import("@kbn/es-mappings").KeywordMapping;
        level: import("@kbn/es-mappings").KeywordMapping;
        workflow: import("@kbn/es-mappings").ObjectMapping<{
            id: import("@kbn/es-mappings").KeywordMapping;
            execution_id: import("@kbn/es-mappings").KeywordMapping;
            step_id: import("@kbn/es-mappings").KeywordMapping;
            step_execution_id: import("@kbn/es-mappings").KeywordMapping;
        }>;
    };
};
export interface WorkflowLogEvent extends GetFieldsOf<typeof logsRepositoryMappings> {
    '@timestamp': string;
    message: string;
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    workflow?: {
        id?: string;
        name?: string;
        execution_id?: string;
        step_id?: string;
        step_execution_id?: string;
        step_name?: string;
        step_type?: string;
    };
    event?: {
        action?: string;
        category?: string[];
        type?: string[];
        provider?: string;
        outcome?: 'success' | 'failure' | 'unknown';
        duration?: number;
        start?: string;
        end?: string;
    };
    transaction?: {
        workflow_transaction_id?: string;
        task_transaction_id?: string;
        name?: string;
        type?: string | null;
        is_triggered_by_alerting?: boolean;
        alerting_rule_id?: string;
        transaction_id?: string;
        outcome?: 'success' | 'failure';
    };
    trace?: {
        trace_id?: string;
    };
    error?: {
        message?: string;
        type?: string;
        stack_trace?: string;
    };
    tags?: string[];
    labels?: Record<string, string | number | undefined>;
}
export type LogsRepositoryDataStreamClient = IDataStreamClient<typeof logsRepositoryMappings, WorkflowLogEvent>;
export declare const initializeDataStreamClient: (coreDataStreams: DataStreamsStart) => Promise<LogsRepositoryDataStreamClient>;
export {};
