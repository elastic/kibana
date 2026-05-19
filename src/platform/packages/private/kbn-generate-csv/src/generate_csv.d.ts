import type { Writable } from 'stream';
import type { IScopedClusterClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { ISearchClient } from '@kbn/search-types';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { IFieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type { CancellationToken } from '@kbn/reporting-common';
import type { TaskInstanceFields, TaskRunResult } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type { JobParamsCSV } from '../types';
interface Clients {
    es: IScopedClusterClient;
    data: ISearchClient;
    uiSettings: IUiSettingsClient;
}
interface Dependencies {
    searchSourceStart: ISearchStartSearchSource;
    fieldFormatsRegistry: IFieldFormatsRegistry;
}
export declare class CsvGenerator {
    private job;
    private config;
    private taskInstanceFields;
    private clients;
    private dependencies;
    private cancellationToken;
    private logger;
    private stream;
    private isServerless;
    private jobId;
    private useInternalUser;
    private csvContainsFormulas;
    private maxSizeReached;
    private maxRowsReached;
    private csvRowCount;
    constructor(job: Omit<JobParamsCSV, 'version'>, config: ReportingConfigType['csv'], taskInstanceFields: TaskInstanceFields, clients: Clients, dependencies: Dependencies, cancellationToken: CancellationToken, logger: Logger, stream: Writable, isServerless: boolean | undefined, jobId: string, useInternalUser?: boolean);
    private getFormatters;
    private escapeValues;
    private getColumnsFromTabify;
    private formatCellValues;
    private generateHeader;
    private generateRows;
    generateData(): Promise<TaskRunResult>;
}
export {};
