import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { SearchSourceDependencies } from './search_source';
import { SearchSource } from './search_source';
import type { SerializedSearchSourceFields } from '../..';
/**
 * Deserializes a json string and a set of referenced objects to a `SearchSource` instance.
 * Use this method to re-create the search source serialized using `searchSource.serialize`.
 *
 * This function is a factory function that returns the actual utility when calling it with the
 * required service dependency (index patterns contract). A pre-wired version is also exposed in
 * the start contract of the data plugin as part of the search service
 *
 * @param indexPatterns The index patterns contract of the data plugin
 * @param searchSourceDependencies
 *
 * @return Wired utility function taking two parameters `searchSourceJson`, the json string
 * returned by `serializeSearchSource` and `references`, a list of references including the ones
 * returned by `serializeSearchSource`.
 *
 *
 * @public */
export declare const createSearchSource: (indexPatterns: DataViewsContract, searchSourceDependencies: SearchSourceDependencies) => (searchSourceFields?: SerializedSearchSourceFields, useDataViewLazy?: boolean) => Promise<SearchSource>;
