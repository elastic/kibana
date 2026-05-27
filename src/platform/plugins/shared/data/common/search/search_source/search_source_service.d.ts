import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { SearchSourceDependencies, SerializedSearchSourceFields } from '.';
import { SearchSource } from '.';
export declare class SearchSourceService {
    setup(): {
        getAllMigrations: () => MigrateFunctionsObject;
    };
    start(indexPatterns: DataViewsContract, dependencies: SearchSourceDependencies): {
        /**
         * creates searchsource based on serialized search source fields
         */
        create: (searchSourceFields?: SerializedSearchSourceFields, useDataViewLazy?: boolean) => Promise<SearchSource>;
        createLazy: (searchSourceFields?: SerializedSearchSourceFields) => Promise<SearchSource>;
        /**
         * creates an enpty search source
         */
        createEmpty: () => SearchSource;
        extract: (state: SerializedSearchSourceFields) => {
            state: SerializedSearchSourceFields;
            references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
        };
        inject: (searchSourceFields: SerializedSearchSourceFields & {
            indexRefName?: string;
        }, references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[]) => SerializedSearchSourceFields;
        getAllMigrations: () => MigrateFunctionsObject;
        telemetry: () => {};
    };
    stop(): void;
}
