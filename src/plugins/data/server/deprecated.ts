/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/*
 * Filter helper namespace:
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
import {
  buildCustomFilter,
  buildEmptyFilter,
  buildEsQuery,
  buildExistsFilter,
  buildFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildQueryFilter,
  buildQueryFromFilters,
  buildRangeFilter,
  fromKueryExpression,
  isFilterDisabled,
  nodeTypes,
  toElasticsearchQuery,
} from '../common/es_query';
import { getEsQueryConfig } from '../common/es_query/get_es_query_config';

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

export type { EsQueryConfig, Filter, IFieldSubType, KueryNode, Query } from '../common';
