/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
import { configSchema } from './config';
import type { DataServerPlugin, DataPluginSetup, DataPluginStart } from './plugin';

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

export {
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  UI_SETTINGS,
  DataViewsService as DataViewsCommonService,
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
import { configDeprecationProvider } from './config_deprecations';

export type { ParsedInterval } from '../common';
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
export {
  SearchSessionService,
  NoSearchIdInSessionError,
  INITIAL_SEARCH_SESSION_REST_VERSION,
  INTERNAL_ENHANCED_ES_SEARCH_STRATEGY,
} from './search';

export { shimHitsTotal } from '../common/search';

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

export { getTime, parseInterval } from '../common';

/**
 * Static code to be shared externally
 * @public
 */

export async function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  const { DataServerPlugin } = await import('./plugin');
  return new DataServerPlugin(initializerContext);
}

export type { DataPluginSetup as PluginSetup, DataPluginStart as PluginStart };
export type { DataServerPlugin as Plugin };

export const config: PluginConfigDescriptor<ConfigSchema> = {
  deprecations: configDeprecationProvider,
  exposeToBrowser: {
    search: true,
    query: true,
  },
  schema: configSchema,
};
