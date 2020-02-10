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

import { PluginInitializerContext } from '../../../core/public';

import {
  doesKueryExpressionHaveLuceneSyntaxError,
  fromKueryExpression,
  toElasticsearchQuery,
  nodeTypes,
  buildEsQuery,
  getEsQueryConfig,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,

  // filters
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

/*
 * Filter helper namespace:
 */

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

/*
 * esQuery\esKuery namespaces:
 */

export const esKuery = {
  nodeTypes,
  doesKueryExpressionHaveLuceneSyntaxError,
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

/*
 * Field Formatters helper namespace:
 */

import {
  FieldFormat,
  FieldFormatsRegistry, // exported only for tests. Consider mock.
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
} from '../common/field_formats';

export const fieldFormats = {
  FieldFormat,
  FieldFormatsRegistry, // exported only for tests. Consider mock.

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

export function plugin(initializerContext: PluginInitializerContext) {
  return new DataPublicPlugin(initializerContext);
}

/**
 * Types to be shared externally
 * @public
 */
export { IRequestTypesMap, IResponseTypesMap } from './search';
export * from './types';
export {
  EsQueryConfig,
  // index patterns
  IIndexPattern,
  IFieldType,
  IFieldSubType,
  // kbn field types
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  Filter,
  ExistsFilter,
  RangeFilter,
  PhraseFilter,
  PhrasesFilter,
  RangeFilterMeta,
  RangeFilterParams,
  GeoBoundingBoxFilter,
  GeoPolygonFilter,
  MatchAllFilter,
  // query
  Query,
  // timefilter
  RefreshInterval,
  TimeRange,
  // Field Formats
  IFieldFormat,
  IFieldFormatsRegistry,
  FieldFormatsContentType,
  FieldFormatsGetConfigFn,
  FieldFormatConfig,
  FieldFormatId,
} from '../common';

export {
  QuerySuggestion,
  QuerySuggestionTypes,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  QuerySuggestionBasic,
  QuerySuggestionField,
} from './autocomplete';

export * from './field_formats';
export * from './index_patterns';
export * from './search';
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
  // es query
  KueryNode,
  // index patterns
  isFilterable,
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnFieldType,
  getKbnTypeNames,
  // utils
  parseInterval,
  isNestedField,
} from '../common';

// Export plugin after all other imports
import { DataPublicPlugin } from './plugin';
export { DataPublicPlugin as Plugin };
