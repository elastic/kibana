import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
export interface LogsContextService {
    getAllLogsIndexPattern(): string | undefined;
    isLogsIndexPattern(indexPattern: unknown): boolean;
}
export interface LogsContextServiceDeps {
    logsDataAccess?: LogsDataAccessPluginStart;
}
export declare const DEFAULT_ALLOWED_LOGS_BASE_PATTERNS: string[];
export declare const DEFAULT_ALLOWED_LOGS_BASE_PATTERNS_REGEXP: RegExp;
export declare const createLogsContextService: ({ logsDataAccess, }: LogsContextServiceDeps) => Promise<LogsContextService>;
export declare const getLogsContextService: ({ allLogsIndexPattern, allowedDataSources, }: {
    allLogsIndexPattern: string | undefined;
    allowedDataSources: Array<string | RegExp>;
}) => LogsContextService;
