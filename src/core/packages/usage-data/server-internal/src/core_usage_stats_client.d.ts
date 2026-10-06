import type { IBasePath } from '@kbn/core-http-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { CoreUsageStats, CoreIncrementCounterParams } from '@kbn/core-usage-data-server';
import { type ICoreUsageStatsClient, type BaseIncrementOptions, type IncrementSavedObjectsImportOptions, type IncrementSavedObjectsResolveImportErrorsOptions, type IncrementSavedObjectsExportOptions } from '@kbn/core-usage-data-base-server-internal';
import { type Observable } from 'rxjs';
import type { DeprecatedApiUsageFetcher } from '@kbn/core-usage-data-server';
export declare const BULK_CREATE_STATS_PREFIX = "apiCalls.savedObjectsBulkCreate";
export declare const BULK_GET_STATS_PREFIX = "apiCalls.savedObjectsBulkGet";
export declare const BULK_RESOLVE_STATS_PREFIX = "apiCalls.savedObjectsBulkResolve";
export declare const BULK_UPDATE_STATS_PREFIX = "apiCalls.savedObjectsBulkUpdate";
export declare const BULK_DELETE_STATS_PREFIX = "apiCalls.savedObjectsBulkDelete";
export declare const CREATE_STATS_PREFIX = "apiCalls.savedObjectsCreate";
export declare const DELETE_STATS_PREFIX = "apiCalls.savedObjectsDelete";
export declare const FIND_STATS_PREFIX = "apiCalls.savedObjectsFind";
export declare const GET_STATS_PREFIX = "apiCalls.savedObjectsGet";
export declare const RESOLVE_STATS_PREFIX = "apiCalls.savedObjectsResolve";
export declare const UPDATE_STATS_PREFIX = "apiCalls.savedObjectsUpdate";
export declare const IMPORT_STATS_PREFIX = "apiCalls.savedObjectsImport";
export declare const RESOLVE_IMPORT_STATS_PREFIX = "apiCalls.savedObjectsResolveImportErrors";
export declare const EXPORT_STATS_PREFIX = "apiCalls.savedObjectsExport";
export declare const LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX = "apiCalls.legacyDashboardImport";
export declare const LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX = "apiCalls.legacyDashboardExport";
/**
 * Interface that models some of the core events (e.g. SO HTTP API calls)
 * @internal
 */
export interface CoreUsageEvent {
    id: string;
    isKibanaRequest: boolean;
    types?: string[];
}
/**
 * Interface that models core events triggered by API deprecations. (e.g. SO HTTP API calls)
 * @internal
 */
export interface CoreUsageDeprecatedApiEvent {
    id: string;
    resolved: boolean;
    incrementBy: number;
}
/** @internal */
export interface CoreUsageStatsClientParams {
    debugLogger: (message: string) => void;
    basePath: IBasePath;
    repositoryPromise: Promise<ISavedObjectsRepository>;
    stop$: Observable<void>;
    incrementUsageCounter: (params: CoreIncrementCounterParams) => void;
    bufferTimeMs?: number;
    fetchDeprecatedUsageStats: DeprecatedApiUsageFetcher;
}
/** @internal */
export declare class CoreUsageStatsClient implements ICoreUsageStatsClient {
    private readonly debugLogger;
    private readonly basePath;
    private readonly repositoryPromise;
    private readonly fieldsToIncrement$;
    private readonly flush$;
    private readonly coreUsageEvents$;
    private readonly coreUsageDeprecatedApiCalls$;
    private readonly fetchDeprecatedUsageStats;
    constructor({ debugLogger, basePath, repositoryPromise, stop$, incrementUsageCounter, bufferTimeMs, fetchDeprecatedUsageStats, }: CoreUsageStatsClientParams);
    getUsageStats(): Promise<CoreUsageStats>;
    incrementDeprecatedApi(id: string, { resolved, incrementBy }: {
        resolved: boolean;
        incrementBy: number;
    }): Promise<void>;
    getDeprecatedApiUsageStats(): Promise<import("@kbn/core-usage-data-server").CoreDeprecatedApiUsageStats[]>;
    incrementSavedObjectsBulkCreate(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsBulkGet(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsBulkResolve(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsBulkUpdate(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsBulkDelete(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsCreate(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsDelete(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsFind(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsGet(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsResolve(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsUpdate(options: BaseIncrementOptions): Promise<void>;
    incrementSavedObjectsImport(options: IncrementSavedObjectsImportOptions): Promise<void>;
    incrementSavedObjectsResolveImportErrors(options: IncrementSavedObjectsResolveImportErrorsOptions): Promise<void>;
    incrementSavedObjectsExport(options: IncrementSavedObjectsExportOptions): Promise<void>;
    incrementLegacyDashboardsImport(options: BaseIncrementOptions): Promise<void>;
    incrementLegacyDashboardsExport(options: BaseIncrementOptions): Promise<void>;
    private updateUsageStats;
    private getNamespace;
    private getFieldsToIncrement;
}
