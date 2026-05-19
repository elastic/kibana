import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsRawDocSource, SavedObjectsSearchOptions, SavedObjectsSearchResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
import type { NamespacesBoolFilter } from '../search/search_dsl/query_params';
export interface PerformSearchParams {
    options: SavedObjectsSearchOptions;
}
export declare function performSearch<T extends SavedObjectsRawDocSource, A = unknown>({ options }: PerformSearchParams, { registry, helpers, serializer, allowedTypes, client, extensions }: ApiExecutionContext): Promise<SavedObjectsSearchResponse<T, A>>;
export declare function mergeUserQueryWithNamespacesBool(userQuery: undefined | estypes.QueryDslQueryContainer, namespacesBoolFilter: NamespacesBoolFilter): estypes.QueryDslQueryContainer;
