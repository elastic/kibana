import type { IUiSettingsClient } from '@kbn/core/public';
import { FilterStateStore } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { PersistableStateService } from '@kbn/kibana-utils-plugin/common/persistable_state';
interface PartitionedFilters {
    globalFilters: Filter[];
    appFilters: Filter[];
}
export declare class FilterManager implements PersistableStateService<Filter[]> {
    private filters;
    private updated$;
    private fetch$;
    private uiSettings;
    constructor(uiSettings: IUiSettingsClient);
    private mergeIncomingFilters;
    private static mergeFilters;
    private static partitionFilters;
    private handleStateUpdate;
    getFilters(): Filter[];
    getAppFilters(): Filter[];
    getGlobalFilters(): Filter[];
    getPartitionedFilters(): PartitionedFilters;
    getUpdates$(): import("rxjs").Observable<void>;
    getFetches$(): import("rxjs").Observable<void>;
    addFilters(filters: Filter[] | Filter, pinFilterStatus?: boolean): void;
    setFilters(newFilters: Filter[], pinFilterStatus?: boolean): void;
    /**
     * Sets new global filters and leaves app filters untouched,
     * Removes app filters for which there is a duplicate within new global filters
     * @param newGlobalFilters
     */
    setGlobalFilters(newGlobalFilters: Filter[]): void;
    /**
     * Sets new app filters and leaves global filters untouched,
     * Removes app filters for which there is a duplicate within new global filters
     * @param newAppFilters
     */
    setAppFilters(newAppFilters: Filter[]): void;
    removeFilter(filter: Filter): void;
    removeAll(): void;
    static setFiltersStore(filters: Filter[], store: FilterStateStore, shouldOverrideStore?: boolean): void;
    extract: (filters: Filter[]) => {
        state: Filter[];
        references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
    };
    inject: (filters: Filter[], references: import("@kbn/core/public").SavedObjectReference[]) => Filter[];
    telemetry: (filters: Filter[], collector: unknown) => {};
    getAllMigrations: () => import("@kbn/kibana-utils-plugin/common/persistable_state").MigrateFunctionsObject;
}
export {};
