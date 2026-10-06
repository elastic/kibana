/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export declare function getNamespacesBoolFilter({
  namespaces,
  registry,
  types,
  typeToNamespacesMap,
}: Pick<QueryParams, 'namespaces' | 'registry' | 'typeToNamespacesMap'> & {
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
export declare function getQueryParams({
  registry,
  namespaces,
  type,
  typeToNamespacesMap,
  search,
  searchFields: searchFieldsParam,
  rootSearchFields,
  defaultSearchOperator,
  hasReference,
  hasReferenceOperator,
  hasNoReference,
  hasNoReferenceOperator,
  kueryNode,
  mappings,
}: QueryParams): {
  query: {
    bool: any;
  };
};
export {};
