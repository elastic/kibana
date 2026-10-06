import type { SavedObjectReference } from '@kbn/core/types';
import type { MigrateFunctionsObject, VersionedState } from '@kbn/kibana-utils-plugin/common';
import type { QueryState } from './query_state';
export declare const extract: (queryState: QueryState) => {
    state: {
        time?: import("./types").TimeRange;
        refreshInterval?: import("@kbn/data-service-server").RefreshInterval;
        query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        filters: import("@kbn/es-query").Filter[];
    };
    references: import("@kbn/core/server").SavedObjectReference[];
};
export declare const inject: (queryState: QueryState, references: SavedObjectReference[]) => {
    time?: import("./types").TimeRange;
    refreshInterval?: import("@kbn/data-service-server").RefreshInterval;
    query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
};
export declare const telemetry: (queryState: QueryState, collector: unknown) => {};
export declare const migrateToLatest: ({ state, version }: VersionedState<QueryState>) => {
    time?: import("./types").TimeRange;
    refreshInterval?: import("@kbn/data-service-server").RefreshInterval;
    query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
    filters: import("@kbn/es-query").Filter[];
};
export declare const getAllMigrations: () => MigrateFunctionsObject;
