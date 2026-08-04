import type { Filter } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/types';
import type { MigrateFunctionsObject, VersionedState } from '@kbn/kibana-utils-plugin/common';
export declare const extract: (filters: Filter[]) => {
    state: Filter[];
    references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
};
export declare const inject: (filters: Filter[], references: SavedObjectReference[]) => Filter[];
export declare const telemetry: (filters: Filter[], collector: unknown) => {};
export declare const migrateToLatest: (filters: VersionedState<Filter[]>) => Filter[];
export declare const getAllMigrations: () => MigrateFunctionsObject;
