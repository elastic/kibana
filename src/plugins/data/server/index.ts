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

export * from './deprecated';
export { getEsQueryConfig } from '../common';

/**
 * Exporters (CSV)
 */

import { datatableToCSV, CSV_MIME_TYPE } from '../common';
export const exporters = {
  datatableToCSV,
  CSV_MIME_TYPE,
};

/*
 * Field Formats:
 */

export { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../common';

/*
 * Index patterns:
 */

export {
  IndexPatternsFetcher,
  shouldReadFieldFromDocValues, // used only in logstash_fields fixture
  FieldDescriptor,
  getCapabilitiesForRollupIndices,
} from './index_patterns';

export {
  IndexPatternField,
  IFieldType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  IndexPatternAttributes,
  UI_SETTINGS,
  IndexPattern,
  IndexPatternsService,
  IndexPatternsService as IndexPatternsCommonService,
} from '../common';

/**
 * Search
 */

import {
  // aggs
  CidrMask,
  dateHistogramInterval,
  IpAddress,
  parseInterval,
  // tabify
  calcAutoIntervalLessThan,
} from '../common';
import { autocompleteConfigDeprecationProvider } from './config_deprecations';

export {
  // aggs
  METRIC_TYPES,
  ParsedInterval,
  // search
  ISearchOptions,
  IEsSearchRequest,
  IEsSearchResponse,
  ES_SEARCH_STRATEGY,
} from '../common';

export {
  IScopedSearchClient,
  ISearchStrategy,
  SearchStrategyDependencies,
  shimHitsTotal,
  SearchSessionService,
  ISearchSessionService,
  SearchRequestHandlerContext,
  DataRequestHandlerContext,
  AsyncSearchStatusResponse,
  NoSearchIdInSessionError,
} from './search';

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
 * Types to be shared externally
 * @public
 */

export {
  castEsToKbnFieldTypeName,
  getTime,
  // timefilter
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
  deprecations: autocompleteConfigDeprecationProvider,
  exposeToBrowser: {
    autocomplete: true,
    search: true,
  },
  schema: configSchema,
};
