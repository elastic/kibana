/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import { getQueryParams, type SearchOperator } from './query_params';
import { getPitParams } from './pit_params';
import { getSortingParams } from './sorting_params';

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
  } = options;

  if (!type) {
    throw Boom.notAcceptable('type must be specified');
  }

  if (sortOrder && !sortField) {
    throw Boom.notAcceptable('sortOrder requires a sortField');
  }

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
    }),
    ...getSortingParams(mappings, type, sortField, sortOrder),
    ...(pit ? getPitParams(pit) : {}),
    search_after: searchAfter,
  };
}
