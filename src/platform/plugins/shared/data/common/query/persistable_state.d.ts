import type { SavedObjectReference } from '@kbn/core/types';
import type { MigrateFunctionsObject, VersionedState } from '@kbn/kibana-utils-plugin/common';
import type { QueryState } from './query_state';
export declare const extract: (queryState: QueryState) => {
    state: {
        filters: import("@kbn/es-query").Filter[];
        time?: import("./types").TimeRange;
        refreshInterval?: import("@kbn/data-service-server").RefreshInterval;
        query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    };
    references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
};
export declare const inject: (queryState: QueryState, references: SavedObjectReference[]) => {
    filters: import("@kbn/es-query").Filter[];
    time?: import("./types").TimeRange;
    refreshInterval?: import("@kbn/data-service-server").RefreshInterval;
    query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
};
export declare const telemetry: (queryState: QueryState, collector: unknown) => {};
export declare const migrateToLatest: ({ state, version }: VersionedState<QueryState>) => {
    filters: import("@kbn/es-query").Filter[];
    time?: import("./types").TimeRange;
    refreshInterval?: import("@kbn/data-service-server").RefreshInterval;
    query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
};
export declare const getAllMigrations: () => MigrateFunctionsObject;
