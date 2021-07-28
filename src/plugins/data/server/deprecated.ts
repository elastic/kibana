/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  buildQueryFilter,
  buildCustomFilter,
  buildEmptyFilter,
  buildExistsFilter,
  buildFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
  isFilterDisabled,
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
  buildEsQuery,
  buildQueryFromFilters,
} from '../common';
/*
 * @deprecated Please import from the package kbn/es-query directly. This will be deprecated in v8.0.0.
 * Filter helper namespace:
 */
export const esFilters = {
  buildQueryFilter,
  buildCustomFilter,
  buildEmptyFilter,
  buildExistsFilter,
  buildFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
  isFilterDisabled,
};

/*
 * esQuery and esKuery:
 */

import { getEsQueryConfig } from '../common';

/*
 * Filter helper namespace
 * @deprecated Please import from the package kbn/es-query directly. This will be deprecated in v8.0.0.
 */
export const esKuery = {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
};

/*
 * Filter helper namespace
 * @deprecated Please import from the package kbn/es-query directly. This will be deprecated in v8.0.0.
 */
export const esQuery = {
  buildQueryFromFilters,
  getEsQueryConfig,
  buildEsQuery,
};

export type { Filter, Query, EsQueryConfig, KueryNode, IFieldSubType } from '../common';
