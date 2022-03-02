/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getEsQueryConfig } from './get_es_query_config';

// NOTE: Trick to deprecate exports https://stackoverflow.com/a/49152018/372086
import {
  enableFilter as oldEnableFilter,
  pinFilter as oldPinFilter,
  toggleFilterDisabled as oldToggleFilterDisabled,
  isFilterDisabled as oldIsFilterDisabled,
  disableFilter as oldDisableFilter,
  fromKueryExpression as oldFromKueryExpression,
  toElasticsearchQuery as oldToElasticsearchQuery,
  nodeTypes as oldNodeTypes,
  buildEsQuery as oldBuildEsQuery,
  buildQueryFromFilters as oldBuildQueryFromFilters,
  luceneStringToDsl as oldLuceneStringToDsl,
  decorateQuery as olddecorateQuery,
  getPhraseFilterField as oldgetPhraseFilterField,
  getPhraseFilterValue as oldgetPhraseFilterValue,
  isFilterPinned as oldIsFilterPinned,
  nodeBuilder as oldNodeBuilder,
  isFilters as oldIsFilters,
  isExistsFilter as oldIsExistsFilter,
  isMatchAllFilter as oldIsMatchAllFilter,
  isPhraseFilter as oldIsPhraseFilter,
  isPhrasesFilter as oldIsPhrasesFilter,
  isRangeFilter as oldIsRangeFilter,
  isQueryStringFilter as oldIsQueryStringFilter,
  buildQueryFilter as oldBuildQueryFilter,
  buildPhrasesFilter as oldBuildPhrasesFilter,
  buildPhraseFilter as oldBuildPhraseFilter,
  buildRangeFilter as oldBuildRangeFilter,
  buildCustomFilter as oldBuildCustomFilter,
  buildFilter as oldBuildFilter,
  buildEmptyFilter as oldBuildEmptyFilter,
  buildExistsFilter as oldBuildExistsFilter,
  toggleFilterNegated as oldtoggleFilterNegated,
  Filter as oldFilter,
  RangeFilterParams as oldRangeFilterParams,
  ExistsFilter as oldExistsFilter,
  PhraseFilter as oldPhraseFilter,
  MatchAllFilter as oldMatchAllFilter,
  RangeFilter as oldRangeFilter,
  KueryNode as oldKueryNode,
  FilterMeta as oldFilterMeta,
  FILTERS as oldFILTERS,
  EsQueryConfig as oldEsQueryConfig,
  compareFilters as oldCompareFilters,
  COMPARE_ALL_OPTIONS as OLD_COMPARE_ALL_OPTIONS,
  dedupFilters as oldDedupFilters,
  onlyDisabledFiltersChanged as oldOnlyDisabledFiltersChanged,
  uniqFilters as oldUniqFilters,
  FilterStateStore,
} from '@kbn/es-query';

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isFilterDisabled = oldIsFilterDisabled;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const disableFilter = oldDisableFilter;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const fromKueryExpression = oldFromKueryExpression;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const toElasticsearchQuery = oldToElasticsearchQuery;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const nodeTypes = oldNodeTypes;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildEsQuery = oldBuildEsQuery;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildQueryFromFilters = oldBuildQueryFromFilters;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const luceneStringToDsl = oldLuceneStringToDsl;
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const decorateQuery = olddecorateQuery;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const getPhraseFilterField = oldgetPhraseFilterField;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const getPhraseFilterValue = oldgetPhraseFilterValue;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isFilterPinned = oldIsFilterPinned;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const nodeBuilder = oldNodeBuilder;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isFilters = oldIsFilters;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const uniqFilters = oldUniqFilters;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const onlyDisabledFiltersChanged = oldOnlyDisabledFiltersChanged;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isExistsFilter = oldIsExistsFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isMatchAllFilter = oldIsMatchAllFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isPhraseFilter = oldIsPhraseFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isPhrasesFilter = oldIsPhrasesFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isRangeFilter = oldIsRangeFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isQueryStringFilter = oldIsQueryStringFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildQueryFilter = oldBuildQueryFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildPhrasesFilter = oldBuildPhrasesFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildPhraseFilter = oldBuildPhraseFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildRangeFilter = oldBuildRangeFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildCustomFilter = oldBuildCustomFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildFilter = oldBuildFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildEmptyFilter = oldBuildEmptyFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const buildExistsFilter = oldBuildExistsFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const toggleFilterNegated = oldtoggleFilterNegated;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const enableFilter = oldEnableFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const pinFilter = oldPinFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const toggleFilterDisabled = oldToggleFilterDisabled;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const compareFilters = oldCompareFilters;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const dedupFilters = oldDedupFilters;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const COMPARE_ALL_OPTIONS = OLD_COMPARE_ALL_OPTIONS;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const FILTERS = oldFILTERS;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type Filter = oldFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type RangeFilterParams = oldRangeFilterParams;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type ExistsFilter = oldExistsFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type PhraseFilter = oldPhraseFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type MatchAllFilter = oldMatchAllFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type RangeFilter = oldRangeFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type KueryNode = oldKueryNode;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type FilterMeta = oldFilterMeta;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type EsQueryConfig = oldEsQueryConfig;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */

export type {
  Filter,
  RangeFilterParams,
  ExistsFilter,
  PhraseFilter,
  MatchAllFilter,
  RangeFilter,
  KueryNode,
  FilterMeta,
  EsQueryConfig,
};
export {
  COMPARE_ALL_OPTIONS,
  compareFilters,
  enableFilter,
  pinFilter,
  toggleFilterDisabled,
  disableFilter,
  fromKueryExpression,
  toElasticsearchQuery,
  nodeTypes,
  buildEsQuery,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
  getPhraseFilterField,
  getPhraseFilterValue,
  isFilterPinned,
  nodeBuilder,
  isFilters,
  isExistsFilter,
  isMatchAllFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isRangeFilter,
  isQueryStringFilter,
  buildQueryFilter,
  buildPhrasesFilter,
  buildPhraseFilter,
  buildRangeFilter,
  buildCustomFilter,
  buildFilter,
  buildEmptyFilter,
  buildExistsFilter,
  toggleFilterNegated,
  FILTERS,
  isFilterDisabled,
  dedupFilters,
  onlyDisabledFiltersChanged,
  uniqFilters,
  FilterStateStore,
};
