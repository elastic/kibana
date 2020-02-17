/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './index.scss';

import { PluginInitializerContext } from '../../../core/public';

/*
 * Filters:
 */

import {
  FILTERS,
  buildEmptyFilter,
  buildPhrasesFilter,
  buildExistsFilter,
  buildPhraseFilter,
  buildQueryFilter,
  buildRangeFilter,
  toggleFilterNegated,
  disableFilter,
  FilterStateStore,
  getPhraseFilterField,
  getPhraseFilterValue,
  isPhraseFilter,
  isExistsFilter,
  isPhrasesFilter,
  isRangeFilter,
  isMatchAllFilter,
  isMissingFilter,
  isQueryStringFilter,
  getDisplayValueFromFilter,
  isFilterPinned,
} from '../common';

import { FilterLabel } from './ui/filter_bar';

import {
  compareFilters,
  COMPARE_ALL_OPTIONS,
  generateFilters,
  onlyDisabledFiltersChanged,
  changeTimeFilter,
  mapAndFlattenFilters,
  extractTimeFilter,
} from './query';

// Filter helpers namespace:
export const esFilters = {
  FilterLabel,

  FILTERS,
  FilterStateStore,

  buildEmptyFilter,
  buildPhrasesFilter,
  buildExistsFilter,
  buildPhraseFilter,
  buildQueryFilter,
  buildRangeFilter,

  isPhraseFilter,
  isExistsFilter,
  isPhrasesFilter,
  isRangeFilter,
  isMatchAllFilter,
  isMissingFilter,
  isQueryStringFilter,
  isFilterPinned,

  toggleFilterNegated,
  disableFilter,
  getPhraseFilterField,
  getPhraseFilterValue,
  getDisplayValueFromFilter,

  compareFilters,
  COMPARE_ALL_OPTIONS,
  generateFilters,
  onlyDisabledFiltersChanged,

  changeTimeFilter,
  mapAndFlattenFilters,
  extractTimeFilter,
};

export {
  RangeFilter,
  RangeFilterMeta,
  RangeFilterParams,
  ExistsFilter,
  PhrasesFilter,
  PhraseFilter,
  CustomFilter,
  MatchAllFilter,
} from '../common';

/*
 * esQuery and esKuery:
 */

import {
  fromKueryExpression,
  toElasticsearchQuery,
  nodeTypes,
  buildEsQuery,
  getEsQueryConfig,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
} from '../common';

export const esKuery = {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
};

export const esQuery = {
  buildEsQuery,
  getEsQueryConfig,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
};

export { EsQueryConfig, KueryNode } from '../common';

/*
 * Field Formatters:
 */

import {
  FieldFormat,
  FieldFormatsRegistry,
  DEFAULT_CONVERTER_COLOR,
  HTML_CONTEXT_TYPE,
  TEXT_CONTEXT_TYPE,
  FIELD_FORMAT_IDS,
  BoolFormat,
  BytesFormat,
  ColorFormat,
  DateFormat,
  DateNanosFormat,
  DurationFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  UrlFormat,
  StringFormat,
  TruncateFormat,
  serializeFieldFormat,
} from '../common/field_formats';

// Field formats helpers namespace:
export const fieldFormats = {
  FieldFormat,
  FieldFormatsRegistry, // exported only for tests. Consider mock.

  serialize: serializeFieldFormat,

  DEFAULT_CONVERTER_COLOR,
  HTML_CONTEXT_TYPE,
  TEXT_CONTEXT_TYPE,
  FIELD_FORMAT_IDS,

  BoolFormat,
  BytesFormat,
  ColorFormat,
  DateFormat,
  DateNanosFormat,
  DurationFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  UrlFormat,
  StringFormat,
  TruncateFormat,
};

export {
  IFieldFormat,
  IFieldFormatsRegistry,
  FieldFormatsContentType,
  FieldFormatsGetConfigFn,
  FieldFormatConfig,
  FieldFormatId,
} from '../common';

/*
 * Index patterns:
 */

import { isNestedField, isFilterable } from '../common';

import {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
  ILLEGAL_CHARACTERS,
  isDefault,
  validateIndexPattern,
  getFromSavedObject,
  flattenHitWrapper,
  getRoutes,
  formatHitProvider,
} from './index_patterns';

// Index patterns namespace:
export const indexPatterns = {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
  ILLEGAL_CHARACTERS,
  isDefault,
  isFilterable,
  isNestedField,
  validate: validateIndexPattern,
  getFromSavedObject,
  flattenHitWrapper,
  // TODO: exported only in stub_index_pattern test. Move into data plugin and remove export.
  getRoutes,
  formatHitProvider,
};

export {
  IndexPatternsContract,
  IndexPattern,
  Field as IndexPatternField,
  TypeMeta as IndexPatternTypeMeta,
  AggregationRestrictions as IndexPatternAggRestrictions,
  // TODO: exported only in stub_index_pattern test. Move into data plugin and remove export.
  FieldList as IndexPatternFieldList,
} from './index_patterns';

export {
  IIndexPattern,
  IFieldType,
  IFieldSubType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
} from '../common';

/*
 * Autocomplete query suggestions:
 */

export {
  QuerySuggestion,
  QuerySuggestionTypes,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  QuerySuggestionBasic,
  QuerySuggestionField,
} from './autocomplete';

/*
 * Search:
 */

export { IRequestTypesMap, IResponseTypesMap } from './search';
export * from './search';

/**
 * Types to be shared externally
 * @public
 */
export { Filter, Query, RefreshInterval, TimeRange } from '../common';

export {
  createSavedQueryService,
  syncAppFilters,
  syncQuery,
  getTime,
  getQueryLog,
  getQueryStateContainer,
  FilterManager,
  SavedQuery,
  SavedQueryService,
  SavedQueryTimeFilter,
  SavedQueryAttributes,
  InputTimeRange,
  TimefilterSetup,
  TimeHistory,
  TimefilterContract,
  TimeHistoryContract,
} from './query';
export * from './ui';
export {
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnTypeNames,
  // utils
  parseInterval,
} from '../common';

/*
 * Plugin setup
 */

import { DataPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DataPublicPlugin(initializerContext);
}

export { DataPublicPluginSetup, DataPublicPluginStart, IDataPluginServices } from './types';

// Export plugin after all other imports
export { DataPublicPlugin as Plugin };
