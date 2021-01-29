/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Boom from '@hapi/boom';

import { IndexMapping } from '../../../mappings';
import { getQueryParams, HasReferenceQueryParams, SearchOperator } from './query_params';
import { getSortingParams } from './sorting_params';
import { ISavedObjectTypeRegistry } from '../../../saved_objects_type_registry';

type KueryNode = any;

interface GetSearchDslOptions {
  type: string | string[];
  search?: string;
  defaultSearchOperator?: SearchOperator;
  searchFields?: string[];
  rootSearchFields?: string[];
  sortField?: string;
  sortOrder?: string;
  namespaces?: string[];
  typeToNamespacesMap?: Map<string, string[] | undefined>;
  hasReference?: HasReferenceQueryParams | HasReferenceQueryParams[];
  hasReferenceOperator?: SearchOperator;
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
    sortField,
    sortOrder,
    namespaces,
    typeToNamespacesMap,
    hasReference,
    hasReferenceOperator,
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
      kueryNode,
    }),
    ...getSortingParams(mappings, type, sortField, sortOrder),
  };
}
