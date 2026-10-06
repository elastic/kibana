/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export declare function getSearchDsl(
  mappings: IndexMapping,
  registry: ISavedObjectTypeRegistry,
  options: GetSearchDslOptions
): {
  query: {
    bool: any;
  };
  pit?:
    | {
        id: string;
        keep_alive?: string | undefined;
      }
    | undefined;
  sort?: estypes.SortCombinations[];
  search_after: estypes.SortResults | undefined;
};
export {};
