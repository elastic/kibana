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
/**
 * Bump when Elasticsearch index mappings for the workflows execution logs data stream change.
 * Compared on startup against `mappings._meta.managed_index_mappings_version` on backing indices
 * to decide whether to schedule a lazy rollover.
 *
 * This is independent of `registerDataStream({ version })` above (template lifecycle) and from
 * `WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION` — logs and events streams can bump separately.
 */
export declare const WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION = 2;
export declare const initializeDataStreamClient: (coreDataStreams: DataStreamsStart) => Promise<LogsRepositoryDataStreamClient>;
export {};
