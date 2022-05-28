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
 * Filter helper namespace:
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
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
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
export const esKuery = {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
};

/*
 * Filter helper namespace
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
export const esQuery = {
  buildQueryFromFilters,
  getEsQueryConfig,
  buildEsQuery,
};

export type { Filter, Query, EsQueryConfig, KueryNode } from '../common';
