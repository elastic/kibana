import type { Writable } from 'stream';
import type { IScopedClusterClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { type Filter } from '@kbn/es-query';
import type { CancellationToken } from '@kbn/reporting-common';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';
import { type TaskInstanceFields } from '@kbn/reporting-common/types';
export interface JobParamsCsvESQL {
    query: {
        esql: string;
    };
    columns?: string[];
    filters?: Filter[];
    browserTimezone?: string;
    forceNow?: string;
    timeFieldName?: string;
}
interface Clients {
    es: IScopedClusterClient;
    data: IScopedSearchClient;
    uiSettings: IUiSettingsClient;
}
export declare class CsvESQLGenerator {
    private job;
    private config;
    private taskInstanceFields;
    private clients;
    private cancellationToken;
    private logger;
    private stream;
    private jobId;
    private csvContainsFormulas;
    private maxSizeReached;
    private csvRowCount;
    constructor(job: JobParamsCsvESQL, config: ReportingConfigType['csv'], taskInstanceFields: TaskInstanceFields, clients: Clients, cancellationToken: CancellationToken, logger: Logger, stream: Writable, jobId: string);
    generateData(): Promise<TaskRunResult>;
    private generateRows;
    private escapeValues;
}
export {};
