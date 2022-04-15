/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/109904
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginConfigDescriptor, PluginInitializerContext } from '../../../core/server';
import { ConfigSchema, configSchema } from '../config';
import { DataServerPlugin, DataPluginSetup, DataPluginStart } from './plugin';

export * from './deprecated';
export { getEsQueryConfig, DEFAULT_QUERY_LANGUAGE } from '../common';

export { getRequestAbortedSignal } from './lib';

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

export { DATA_VIEW_SAVED_OBJECT_TYPE } from '../common';

/*
 * Index patterns:
 */

export type { FieldDescriptor, IndexPatternsServiceStart } from './data_views';
export {
  IndexPatternsFetcher,
  shouldReadFieldFromDocValues,
  getCapabilitiesForRollupIndices,
} from './data_views';

export type { IndexPatternAttributes } from '../common';
export {
  IndexPatternField,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  UI_SETTINGS,
  IndexPattern,
  IndexPatternsService,
  IndexPatternsService as IndexPatternsCommonService,
  DataView,
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

export type {
  ParsedInterval,
  ISearchOptions,
  IEsSearchRequest,
  IEsSearchResponse,
} from '../common';
export { METRIC_TYPES, ES_SEARCH_STRATEGY } from '../common';

export type {
  IScopedSearchClient,
  ISearchStrategy,
  SearchStrategyDependencies,
  ISearchSessionService,
  SearchRequestHandlerContext,
  DataRequestHandlerContext,
  AsyncSearchStatusResponse,
} from './search';
export { shimHitsTotal, SearchSessionService, NoSearchIdInSessionError } from './search';

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

export type { TimeRange } from '../common';
export { getTime, parseInterval } from '../common';

/**
 * Static code to be shared externally
 * @public
 */

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new DataServerPlugin(initializerContext);
}

export type { DataPluginSetup as PluginSetup, DataPluginStart as PluginStart };
export { DataServerPlugin as Plugin };

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    search: true,
  },
  schema: configSchema,
};
