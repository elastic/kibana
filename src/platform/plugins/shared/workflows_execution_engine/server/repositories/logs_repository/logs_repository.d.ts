import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { type WorkflowLogEvent } from './data_stream';
export interface LogSearchResult {
    total: number;
    logs: WorkflowLogEvent[];
}
export interface SearchLogsParams {
    sortField?: string;
    sortOrder?: SortOrder;
    limit?: number;
    offset?: number;
    spaceId?: string;
    level?: string;
    executionId?: string;
    stepExecutionId?: string;
    stepId?: string;
}
export declare class LogsRepository {
    private readonly coreDataStreams;
    constructor(coreDataStreams: DataStreamsStart);
    createLogs(logEvents: WorkflowLogEvent[]): Promise<void>;
    getRecentLogs(limit?: number): Promise<LogSearchResult>;
    searchLogs(params: SearchLogsParams): Promise<LogSearchResult>;
    private searchDataStream;
}
