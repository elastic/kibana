/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import {
  getQueryParams,
  getSemanticClause,
  getNamespacesBoolFilter,
  type SearchOperator,
} from './query_params';
import { getPitParams } from './pit_params';
import { getSortingParams } from './sorting_params';

type KueryNode = any;

/** Options accepted by {@link getSearchDsl}. */
export interface GetSearchDslOptions {
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
  /**
   * When present, emits an ES `retriever` instead of a bare `query`.
   * Server-side only — never expose over the public HTTP route.
   */
  semanticSearch?: {
    /** Natural-language query text forwarded to the `semantic` query. */
    query: string;
    /** Source attribute names to target; defaults to all declared semantic fields per type. */
    fields?: string[];
    /**
     * `'semantic'` wraps the semantic query in a single `standard` retriever.
     * `'hybrid'` (default) uses RRF over BM25 + semantic leaves.
     */
    mode?: 'semantic' | 'hybrid';
    /** RRF `rank_window_size` (positive integer, 1–1000; default 100). */
    rankWindowSize?: number;
    /** RRF `rank_constant` (positive integer ≥ 1; default 60). */
    rankConstant?: number;
  };
}

export function getSearchDsl(
  mappings: IndexMapping,
  registry: ISavedObjectTypeRegistry,
  options: GetSearchDslOptions
) {
  const {
    type,
    search,
    defaultSearchOperator,
    searchFields,
    rootSearchFields,
    searchAfter,
    sortField,
    sortOrder,
    namespaces,
    pit,
    typeToNamespacesMap,
    hasReference,
    hasReferenceOperator,
    hasNoReference,
    hasNoReferenceOperator,
    kueryNode,
    semanticSearch,
  } = options;

  if (!type) {
    throw Boom.notAcceptable('type must be specified');
  }

  if (sortOrder && !sortField) {
    throw Boom.notAcceptable('sortOrder requires a sortField');
  }

  // When semanticSearch is present, emit a `retriever` instead of the plain `query`.
  // Top-level sort, search_after, and pit are rejected by performFind before reaching here.
  if (semanticSearch) {
    // Resolve the types array the same way getQueryParams does internally.
    const types: string[] = typeToNamespacesMap
      ? Array.from(typeToNamespacesMap.keys())
      : Array.isArray(type)
      ? type
      : [type];

    // Build the namespace/type bool filter ONCE; inject into every leaf independently (S5).
    const nsTypeFilter = getNamespacesBoolFilter({
      namespaces,
      registry,
      types,
      typeToNamespacesMap,
    });

    const semanticClause = getSemanticClause(
      registry,
      types,
      semanticSearch.query,
      semanticSearch.fields
    );

    const mode = semanticSearch.mode ?? 'hybrid';

    if (mode === 'semantic') {
      // Single standard retriever: semantic query gated by the namespace/type filter.
      return {
        retriever: {
          standard: {
            query: {
              bool: {
                must: [semanticClause],
                filter: [nsTypeFilter],
              },
            },
          },
        },
      };
    }

    // hybrid (default): RRF over BM25 leaf and semantic leaf.
    // The BM25 leaf is today's getQueryParams output (already contains nsTypeFilter in its
    // query.bool.filter).  The semantic leaf independently carries a copy of nsTypeFilter.
    const { query: bm25Query } = getQueryParams({
      registry,
      namespaces,
      type,
      typeToNamespacesMap,
      search,
      searchFields,
      rootSearchFields,
      defaultSearchOperator,
      hasReference,
      hasReferenceOperator,
      hasNoReference,
      hasNoReferenceOperator,
      kueryNode,
      mappings,
    });

    return {
      retriever: {
        rrf: {
          retrievers: [
            // BM25 leaf: nsTypeFilter already embedded in query.bool.filter via getQueryParams.
            { standard: { query: bm25Query } },
            // Semantic leaf: nsTypeFilter independently injected (S5 invariant).
            {
              standard: {
                query: {
                  bool: {
                    must: [semanticClause],
                    filter: [nsTypeFilter],
                  },
                },
              },
            },
          ],
          rank_window_size: semanticSearch.rankWindowSize ?? 100,
          rank_constant: semanticSearch.rankConstant ?? 60,
        },
      },
    };
  }

  // Non-semantic path: byte-identical to the pre-change behaviour.
  return {
    ...getQueryParams({
      registry,
      namespaces,
      type,
      typeToNamespacesMap,
      search,
      searchFields,
      rootSearchFields,
      defaultSearchOperator,
      hasReference,
      hasReferenceOperator,
      hasNoReference,
      hasNoReferenceOperator,
      kueryNode,
      mappings,
    }),
    ...getSortingParams(mappings, type, sortField, sortOrder, pit),
    ...(pit ? getPitParams(pit) : {}),
    search_after: searchAfter,
  };
}
