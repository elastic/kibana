import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { SearchSourceDependencies, SerializedSearchSourceFields } from '.';
import { injectReferences, SearchSource } from '.';
declare const getAllMigrations: () => MigrateFunctionsObject;
export declare class SearchSourceService {
    setup(): {
        getAllMigrations: typeof getAllMigrations;
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
            references: import("@kbn/core/server").SavedObjectReference[];
        };
        inject: typeof injectReferences;
        getAllMigrations: typeof getAllMigrations;
        telemetry: () => {};
    };
    stop(): void;
}
export {};
