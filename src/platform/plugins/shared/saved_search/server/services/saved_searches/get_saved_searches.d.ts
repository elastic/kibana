import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
interface GetSavedSearchDependencies {
    savedObjects: SavedObjectsClientContract;
    searchSourceStart: ISearchStartSearchSource;
}
export declare const getSavedSearch: (savedSearchId: string, deps: GetSavedSearchDependencies) => Promise<import("../../../common").SavedSearch>;
export {};
