/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type {
  CustomFilter as oldCustomFilter,
  EsQueryConfig as oldEsQueryConfig,
  ExistsFilter as oldExistsFilter,
  Filter as oldFilter,
  FilterMeta as oldFilterMeta,
  IFieldSubType as oldIFieldSubType,
  KueryNode as oldKueryNode,
  MatchAllFilter as oldMatchAllFilter,
  MissingFilter as oldMissingFilter,
  PhraseFilter as oldPhraseFilter,
  PhrasesFilter as oldPhrasesFilter,
  RangeFilter as oldRangeFilter,
  RangeFilterMeta as oldRangeFilterMeta,
  RangeFilterParams as oldRangeFilterParams,
} from '@kbn/es-query';
import {
  buildCustomFilter as oldBuildCustomFilter,
  buildEmptyFilter as oldBuildEmptyFilter,
  buildEsQuery as oldBuildEsQuery,
  buildExistsFilter as oldBuildExistsFilter,
  buildFilter as oldBuildFilter,
  buildPhraseFilter as oldBuildPhraseFilter,
  buildPhrasesFilter as oldBuildPhrasesFilter,
  buildQueryFilter as oldBuildQueryFilter,
  buildQueryFromFilters as oldBuildQueryFromFilters,
  buildRangeFilter as oldBuildRangeFilter,
  compareFilters as oldCompareFilters,
  COMPARE_ALL_OPTIONS as OLD_COMPARE_ALL_OPTIONS,
  decorateQuery as olddecorateQuery,
  dedupFilters as oldDedupFilters,
  disableFilter as oldDisableFilter,
  enableFilter as oldEnableFilter,
  FILTERS as oldFILTERS,
  FilterStateStore,
  fromKueryExpression as oldFromKueryExpression,
  getPhraseFilterField as oldgetPhraseFilterField,
  getPhraseFilterValue as oldgetPhraseFilterValue,
  isExistsFilter as oldIsExistsFilter,
  isFilter as oldIsFilter,
  isFilterDisabled as oldIsFilterDisabled,
  isFilterPinned as oldIsFilterPinned,
  isFilters as oldIsFilters,
  isMatchAllFilter as oldIsMatchAllFilter,
  isMissingFilter as oldIsMissingFilter,
  isPhraseFilter as oldIsPhraseFilter,
  isPhrasesFilter as oldIsPhrasesFilter,
  isQueryStringFilter as oldIsQueryStringFilter,
  isRangeFilter as oldIsRangeFilter,
  luceneStringToDsl as oldLuceneStringToDsl,
  nodeBuilder as oldNodeBuilder,
  nodeTypes as oldNodeTypes,
  onlyDisabledFiltersChanged as oldOnlyDisabledFiltersChanged,
  pinFilter as oldPinFilter,
  toElasticsearchQuery as oldToElasticsearchQuery,
  toggleFilterDisabled as oldToggleFilterDisabled,
  toggleFilterNegated as oldtoggleFilterNegated,
  uniqFilters as oldUniqFilters,
} from '@kbn/es-query';

export { getEsQueryConfig } from './get_es_query_config';
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
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
  isMissingFilter,
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
  isFilter,
  isFilterDisabled,
  dedupFilters,
  onlyDisabledFiltersChanged,
  uniqFilters,
  FilterStateStore,
  Filter,
  RangeFilterMeta,
  RangeFilterParams,
  ExistsFilter,
  PhrasesFilter,
  PhraseFilter,
  MatchAllFilter,
  CustomFilter,
  MissingFilter,
  RangeFilter,
  KueryNode,
  FilterMeta,
  IFieldSubType,
  EsQueryConfig,
};

// NOTE: Trick to deprecate exports https://stackoverflow.com/a/49152018/372086
/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
const isFilter = oldIsFilter;
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
const isMissingFilter = oldIsMissingFilter;

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
type RangeFilterMeta = oldRangeFilterMeta;

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
type PhrasesFilter = oldPhrasesFilter;

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
type CustomFilter = oldCustomFilter;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type MissingFilter = oldMissingFilter;

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
type IFieldSubType = oldIFieldSubType;

/**
 * @deprecated Import from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
type EsQueryConfig = oldEsQueryConfig;
