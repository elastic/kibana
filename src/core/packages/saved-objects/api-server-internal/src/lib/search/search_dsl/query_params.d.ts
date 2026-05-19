import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { estypes } from '@elastic/elasticsearch';
type KueryNode = any;
export type SearchOperator = 'AND' | 'OR';
interface QueryParams {
    registry: ISavedObjectTypeRegistry;
    namespaces?: string[];
    type?: string | string[];
    typeToNamespacesMap?: Map<string, string[] | undefined>;
    search?: string;
    defaultSearchOperator?: SearchOperator;
    searchFields?: string[];
    rootSearchFields?: string[];
    hasReference?: SavedObjectTypeIdTuple | SavedObjectTypeIdTuple[];
    hasReferenceOperator?: SearchOperator;
    hasNoReference?: SavedObjectTypeIdTuple | SavedObjectTypeIdTuple[];
    hasNoReferenceOperator?: SearchOperator;
    kueryNode?: KueryNode;
    mappings: IndexMapping;
}
export declare function getNamespacesBoolFilter({ namespaces, registry, types, typeToNamespacesMap, }: Pick<QueryParams, 'namespaces' | 'registry' | 'typeToNamespacesMap'> & {
    types: string[];
}): NamespacesBoolFilter;
export interface NamespacesBoolFilter {
    bool: {
        should: estypes.QueryDslQueryContainer[];
        minimum_should_match: number;
    };
}
/**
 *  Get the "query" related keys for the search body
 */
export declare function getQueryParams({ registry, namespaces, type, typeToNamespacesMap, search, searchFields: searchFieldsParam, rootSearchFields, defaultSearchOperator, hasReference, hasReferenceOperator, hasNoReference, hasNoReferenceOperator, kueryNode, mappings, }: QueryParams): {
    query: {
        bool: any;
    };
};
export {};
