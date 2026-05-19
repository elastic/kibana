import type { HttpStart, IUiSettingsClient } from '@kbn/core/public';
import type { PersistableStateService, VersionedState } from '@kbn/kibana-utils-plugin/common';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FilterManager } from './filter_manager';
import { createAddToQueryLog } from './lib';
import type { TimefilterSetup } from './timefilter';
import { createSavedQueryService } from './saved_query/saved_query_service';
import type { QueryState$ } from './state_sync/create_query_state_observable';
import type { QueryState } from './query_state';
import type { QueryStringContract } from './query_string';
import type { NowProviderInternalContract } from '../now_provider';
interface QueryServiceSetupDependencies {
    storage: IStorageWrapper;
    uiSettings: IUiSettingsClient;
    nowProvider: NowProviderInternalContract;
    minRefreshInterval?: number;
}
interface QueryServiceStartDependencies {
    storage: IStorageWrapper;
    uiSettings: IUiSettingsClient;
    http: HttpStart;
}
export interface QuerySetup extends PersistableStateService<QueryState> {
    filterManager: FilterManager;
    timefilter: TimefilterSetup;
    queryString: QueryStringContract;
    state$: QueryState$;
    getState(): QueryState;
}
export interface QueryStart extends PersistableStateService<QueryState> {
    filterManager: FilterManager;
    timefilter: TimefilterSetup;
    queryString: QueryStringContract;
    state$: QueryState$;
    getState(): QueryState;
    addToQueryLog: ReturnType<typeof createAddToQueryLog>;
    savedQueries: ReturnType<typeof createSavedQueryService>;
    getEsQuery(indexPattern: DataView, timeRange?: TimeRange): ReturnType<typeof buildEsQuery>;
}
/**
 * Query Service
 * @internal
 */
export declare class QueryService implements PersistableStateService<QueryState> {
    private minRefreshInterval;
    filterManager: FilterManager;
    timefilter: TimefilterSetup;
    queryStringManager: QueryStringContract;
    state$: QueryState$;
    constructor(minRefreshInterval?: number);
    setup({ storage, uiSettings, nowProvider, minRefreshInterval, }: QueryServiceSetupDependencies): QuerySetup;
    start({ storage, uiSettings, http }: QueryServiceStartDependencies): QueryStart;
    stop(): void;
    private getQueryState;
    extract: (queryState: QueryState) => {
        state: {
            filters: import("@kbn/es-query").Filter[];
            time?: import("../../common").TimeRange;
            refreshInterval?: import("@kbn/data-service-server/src/types").RefreshInterval;
            query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        };
        references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
    };
    inject: (queryState: QueryState, references: import("@kbn/core/public").SavedObjectReference[]) => {
        filters: import("@kbn/es-query").Filter[];
        time?: import("../../common").TimeRange;
        refreshInterval?: import("@kbn/data-service-server/src/types").RefreshInterval;
        query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    };
    telemetry: (queryState: QueryState, collector: unknown) => {};
    getAllMigrations: () => import("@kbn/kibana-utils-plugin/common").MigrateFunctionsObject;
    migrateToLatest: (versionedState: VersionedState) => {
        filters: import("@kbn/es-query").Filter[];
        time?: import("../../common").TimeRange;
        refreshInterval?: import("@kbn/data-service-server/src/types").RefreshInterval;
        query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    };
    private getPersistableStateMethods;
}
export {};
