import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreUsageStats, CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
/** @internal */
export interface BaseIncrementOptions {
    request: KibanaRequest;
    types?: string[];
}
/** @internal */
export type IncrementSavedObjectsImportOptions = BaseIncrementOptions & {
    overwrite: boolean;
    createNewCopies: boolean;
    compatibilityMode?: boolean;
};
/** @internal */
export type IncrementSavedObjectsResolveImportErrorsOptions = BaseIncrementOptions & {
    createNewCopies: boolean;
    compatibilityMode?: boolean;
};
/** @internal */
export type IncrementSavedObjectsExportOptions = BaseIncrementOptions & {
    supportedTypes: string[];
};
/** @internal */
export interface ICoreUsageStatsClient {
    getUsageStats(): Promise<CoreUsageStats>;
    getDeprecatedApiUsageStats(): Promise<CoreDeprecatedApiUsageStats[]>;
    incrementDeprecatedApi(counterName: string, options: {
        resolved?: boolean;
        incrementBy?: number;
    }): Promise<void>;
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
}
