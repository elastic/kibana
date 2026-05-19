import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import { type SearchOperator } from './query_params';
type KueryNode = any;
interface GetSearchDslOptions {
    type: string | string[];
    search?: string;
    defaultSearchOperator?: SearchOperator;
    searchFields?: string[];
    rootSearchFields?: string[];
    searchAfter?: estypes.SortResults;
    sortField?: string;
    sortOrder?: estypes.SortOrder;
    namespaces?: string[];
    pit?: SavedObjectsPitParams;
    typeToNamespacesMap?: Map<string, string[] | undefined>;
    hasReference?: SavedObjectTypeIdTuple | SavedObjectTypeIdTuple[];
    hasReferenceOperator?: SearchOperator;
    hasNoReference?: SavedObjectTypeIdTuple | SavedObjectTypeIdTuple[];
    hasNoReferenceOperator?: SearchOperator;
    kueryNode?: KueryNode;
}
export declare function getSearchDsl(mappings: IndexMapping, registry: ISavedObjectTypeRegistry, options: GetSearchDslOptions): {
    search_after: estypes.SortResults | undefined;
    pit?: {
        keep_alive?: string | undefined;
        id: string;
    } | undefined;
    sort?: estypes.SortCombinations[];
    query: {
        bool: any;
    };
};
export {};
