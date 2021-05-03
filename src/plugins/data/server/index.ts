/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

/**
 * Exporters (CSV)
 */

import { datatableToCSV, CSV_MIME_TYPE } from '../common';
export const exporters = {
  datatableToCSV,
  CSV_MIME_TYPE,
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
  HistogramFormat,
} from '../common/field_formats';

export const fieldFormats = {
  FieldFormatsRegistry,
  FieldFormat,
  BoolFormat,
  BytesFormat,
  ColorFormat,
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
  HistogramFormat,
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
  FieldDescriptor,
  mergeCapabilitiesWithFields,
  getCapabilitiesForRollupIndices,
} from './index_patterns';

export {
  IFieldType,
  IFieldSubType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  IndexPatternAttributes,
  UI_SETTINGS,
  IndexPattern,
  IndexPatternLoadExpressionFunctionDefinition,
  IndexPatternsService,
  IndexPatternsService as IndexPatternsCommonService,
} from '../common';

/**
 * Search
 */

import {
  // aggs
  CidrMask,
  intervalOptions,
  isNumberType,
  isStringType,
  isType,
  parentPipelineType,
  propFilter,
  siblingPipelineType,
  termsAggFilter,
  dateHistogramInterval,
  InvalidEsCalendarIntervalError,
  InvalidEsIntervalFormatError,
  Ipv4Address,
  isValidEsInterval,
  isValidInterval,
  parseEsInterval,
  parseInterval,
  toAbsoluteDates,
  // tabify
  tabifyAggResponse,
  tabifyGetColumns,
  calcAutoIntervalLessThan,
} from '../common';

export {
  // aggs
  AggGroupLabels,
  AggGroupName,
  AggGroupNames,
  AggFunctionsMapping,
  AggParam,
  AggParamOption,
  AggParamType,
  AggConfigOptions,
  BUCKET_TYPES,
  EsaggsExpressionFunctionDefinition,
  IAggConfig,
  IAggConfigs,
  IAggType,
  IFieldParamType,
  IMetricAggType,
  METRIC_TYPES,
  OptionedParamType,
  OptionedValueProp,
  ParsedInterval,
  // expressions
  ExecutionContextSearch,
  ExpressionFunctionKibana,
  ExpressionFunctionKibanaContext,
  ExpressionValueSearchContext,
  KibanaContext,
  // search
  ISearchOptions,
  IEsSearchRequest,
  IEsSearchResponse,
  ES_SEARCH_STRATEGY,
} from '../common';

export {
  IScopedSearchClient,
  ISearchStrategy,
  ISearchSetup,
  ISearchStart,
  SearchStrategyDependencies,
  getDefaultSearchParams,
  getShardTimeout,
  getTotalLoaded,
  toKibanaSearchResponse,
  shimHitsTotal,
  usageProvider,
  searchUsageObserver,
  shimAbortSignal,
  SearchUsage,
  SearchSessionService,
  ISearchSessionService,
  SearchRequestHandlerContext,
  DataRequestHandlerContext,
  AsyncSearchResponse,
  AsyncSearchStatusResponse,
} from './search';

// Search namespace
export const search = {
  aggs: {
    CidrMask,
    dateHistogramInterval,
    intervalOptions,
    InvalidEsCalendarIntervalError,
    InvalidEsIntervalFormatError,
    Ipv4Address,
    isNumberType,
    isStringType,
    isType,
    isValidEsInterval,
    isValidInterval,
    parentPipelineType,
    parseEsInterval,
    parseInterval,
    propFilter,
    siblingPipelineType,
    termsAggFilter,
    toAbsoluteDates,
    calcAutoIntervalLessThan,
  },
  tabifyAggResponse,
  tabifyGetColumns,
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
    search: true,
  },
  schema: configSchema,
};

export type { IndexPatternsServiceProvider } from './index_patterns';
