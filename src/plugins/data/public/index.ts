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

/*
 * esQuery and esKuery:
 */

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
} from '../common';

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
  // exported only in stub_index_pattern test. Move into data plugin and remove export.
  getRoutes,
  formatHitProvider,
};

export {
  IndexPatternsContract,
  IndexPattern,
  Field as IndexPatternField,
  TypeMeta as IndexPatternTypeMeta,
  AggregationRestrictions as IndexPatternAggRestrictions,
  // exported only in stub_index_pattern test. Move into data plugin and remove export.
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

export function plugin(initializerContext: PluginInitializerContext) {
  return new DataPublicPlugin(initializerContext);
}

/**
 * Types to be shared externally
 * @public
 */
export { IRequestTypesMap, IResponseTypesMap } from './search';
export * from './types';
export { Query, RefreshInterval, TimeRange } from '../common';

export * from './search';
export * from './query';
export * from './ui';
export * from './field_formats';
export {
  // es query
  esFilters,
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnFieldType,
  getKbnTypeNames,
  // utils
  parseInterval,
} from '../common';

// Export plugin after all other imports
import { DataPublicPlugin } from './plugin';
export { DataPublicPlugin as Plugin };
