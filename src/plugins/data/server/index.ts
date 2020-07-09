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

import { PluginConfigDescriptor, PluginInitializerContext } from '../../../core/server';
import { ConfigSchema, configSchema } from '../config';
import { DataServerPlugin, DataPluginSetup, DataPluginStart } from './plugin';

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
} from '../common';

/*
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

import {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
  buildEsQuery,
  buildQueryFromFilters,
  getEsQueryConfig,
} from '../common';

export const esKuery = {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
};

export const esQuery = {
  buildQueryFromFilters,
  getEsQueryConfig,
  buildEsQuery,
};

export { EsQueryConfig, KueryNode } from '../common';

/*
 * Field Formats:
 */

import {
  FieldFormatsRegistry,
  FieldFormat,
  BoolFormat,
  BytesFormat,
  ColorFormat,
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
  FieldFormatsRegistry,
  FieldFormat,
  BoolFormat,
  BytesFormat,
  ColorFormat,
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

export { IFieldFormatsRegistry, FieldFormatsGetConfigFn, FieldFormatConfig } from '../common';

/*
 * Index patterns:
 */

import { isNestedField, isFilterable } from '../common';

export const indexPatterns = {
  isFilterable,
  isNestedField,
};

export {
  IndexPatternsFetcher,
  FieldDescriptor as IndexPatternFieldDescriptor,
  shouldReadFieldFromDocValues, // used only in logstash_fields fixture
} from './index_patterns';

export {
  IIndexPattern,
  IFieldType,
  IFieldSubType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  IndexPatternAttributes,
  UI_SETTINGS,
} from '../common';

/**
 * Search
 */

import {
  dateHistogramInterval,
  InvalidEsCalendarIntervalError,
  InvalidEsIntervalFormatError,
  Ipv4Address,
  isValidEsInterval,
  isValidInterval,
  parseEsInterval,
  parseInterval,
  toAbsoluteDates,
} from '../common';

export { ParsedInterval } from '../common';

export {
  ISearch,
  ISearchCancel,
  ISearchOptions,
  IRequestTypesMap,
  IResponseTypesMap,
  ISearchSetup,
  ISearchStart,
  TStrategyTypes,
  ISearchStrategy,
  getDefaultSearchParams,
  getTotalLoaded,
} from './search';

// Search namespace
export const search = {
  aggs: {
    dateHistogramInterval,
    InvalidEsCalendarIntervalError,
    InvalidEsIntervalFormatError,
    Ipv4Address,
    isValidEsInterval,
    isValidInterval,
    parseEsInterval,
    parseInterval,
    toAbsoluteDates,
  },
};

/**
 * Types to be shared externally
 * @public
 */

export {
  // kbn field types
  castEsToKbnFieldTypeName,
  // query
  Filter,
  getTime,
  Query,
  // timefilter
  RefreshInterval,
  TimeRange,
  // utils
  parseInterval,
} from '../common';

/**
 * Static code to be shared externally
 * @public
 */

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new DataServerPlugin(initializerContext);
}

export {
  DataServerPlugin as Plugin,
  DataPluginSetup as PluginSetup,
  DataPluginStart as PluginStart,
};

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    autocomplete: true,
  },
  schema: configSchema,
};
