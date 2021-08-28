/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '../../../core/server/plugins/types';
import { CSV_MIME_TYPE, datatableToCSV } from '../common/exports/export_csv';
import { CidrMask } from '../common/search/aggs/buckets/lib/cidr_mask';
import { calcAutoIntervalLessThan } from '../common/search/aggs/buckets/lib/time_buckets/calc_auto_interval';
import { dateHistogramInterval } from '../common/search/aggs/utils/date_interval_utils/date_histogram_interval';
import { parseInterval } from '../common/search/aggs/utils/date_interval_utils/parse_interval';
import { IpAddress } from '../common/search/aggs/utils/ip_address';
import type { ConfigSchema } from '../config';
import { configSchema } from '../config';
import { autocompleteConfigDeprecationProvider } from './config_deprecations';
import type { DataPluginSetup, DataPluginStart } from './plugin';
import { DataServerPlugin } from './plugin';

export {
  castEsToKbnFieldTypeName,
  ES_FIELD_TYPES,
  ES_SEARCH_STRATEGY,
  getEsQueryConfig,
  getTime,
  IEsSearchRequest,
  IEsSearchResponse,
  IFieldType,
  IndexPattern,
  IndexPatternAttributes,
  IndexPatternField,
  IndexPatternsService as IndexPatternsCommonService,
  IndexPatternsService,
  INDEX_PATTERN_SAVED_OBJECT_TYPE,
  // search
  ISearchOptions,
  KBN_FIELD_TYPES,
  // aggs
  METRIC_TYPES,
  ParsedInterval,
  // utils
  parseInterval,
  // timefilter
  TimeRange,
  UI_SETTINGS,
} from '../common';
export * from './deprecated';
/*
 * Index patterns:
 */
export {
  FieldDescriptor,
  getCapabilitiesForRollupIndices,
  IndexPatternsFetcher,
  shouldReadFieldFromDocValues,
} from './index_patterns';
export {
  AsyncSearchStatusResponse,
  DataRequestHandlerContext,
  IScopedSearchClient,
  ISearchSessionService,
  ISearchStrategy,
  NoSearchIdInSessionError,
  SearchRequestHandlerContext,
  SearchSessionService,
  SearchStrategyDependencies,
  shimHitsTotal,
} from './search';

export type {
  DataServerPlugin as Plugin,
  DataPluginSetup as PluginSetup,
  DataPluginStart as PluginStart,
};
export const exporters = {
  datatableToCSV,
  CSV_MIME_TYPE,
};

// Search namespace
export const search = {
  aggs: {
    CidrMask,
    dateHistogramInterval,
    IpAddress,
    parseInterval,
    calcAutoIntervalLessThan,
  },
};

/**
 * Static code to be shared externally
 * @public
 */

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new DataServerPlugin(initializerContext);
}

export const config: PluginConfigDescriptor<ConfigSchema> = {
  deprecations: autocompleteConfigDeprecationProvider,
  exposeToBrowser: {
    autocomplete: true,
    search: true,
  },
  schema: configSchema,
};
