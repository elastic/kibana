/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { lastValueFrom } from 'rxjs';
import {
  ENHANCED_ES_SEARCH_STRATEGY,
  SQL_SEARCH_STRATEGY,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
} from '@kbn/data-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { VisSearchContext } from '../types';

export interface VisTypeScriptKibanaApiDeps {
  data: DataPublicPluginStart;
}

export interface ESSearchOptions {
  useKibanaContext: boolean;
  timeField?: string;
}

// disallow transport properties that are handled by data_plugin and allow only query related properties
const allowedESSearchRequestKeys = [
  'index',
  'aggregations',
  'aggs',
  'query',
  'q',
  'sort',
  'from',
] as const;
export type ESSearchRequest = Pick<
  estypes.SearchRequest,
  typeof allowedESSearchRequestKeys[number]
>;
export type ESSearchResponse = estypes.SearchResponse;

export interface SQLSearchOptions {
  useKibanaContext: boolean;
  timeField?: string;
}

const allowedSQLSearchRequestKeys = [
  'query',
  'columnar',
  'cursor',
  'fetch_size',
  'filter',
  'time_zone',
] as const;
export type SQLSearchRequest = Pick<
  estypes.SqlQueryRequest,
  typeof allowedSQLSearchRequestKeys[number]
>;
export type SQLSearchResponse = estypes.SqlQueryResponse;

function sanitizeRequest<T extends Record<string, unknown>>(payload: T, allowedKeys: string[]): T {
  if (payload == null || typeof payload !== 'object') return payload;
  return allowedKeys.reduce((sanitized, allowedKey) => {
    if (allowedKey in payload) {
      sanitized[allowedKey] = payload[allowedKey];
    }
    return sanitized;
  }, {} as Record<string, unknown>) as T;
}

export class VisTypeScriptKibanaApi {
  constructor(
    private readonly deps: VisTypeScriptKibanaApiDeps,
    private readonly visSearchContext: VisSearchContext
  ) {}

  async esSearch(
    payload: ESSearchRequest,
    { useKibanaContext = true }: ESSearchOptions = { useKibanaContext: true }
  ): Promise<ESSearchResponse> {
    payload = sanitizeRequest(payload, [...allowedESSearchRequestKeys]);

    if (useKibanaContext) {
      // TODO: adjust request based on this.visSearchContext
      // eslint-disable-next-line no-console
      console.log(this.visSearchContext);
    }

    const response = await lastValueFrom(
      this.deps.data.search.search({ params: payload }, { strategy: ENHANCED_ES_SEARCH_STRATEGY })
    );
    return response.rawResponse;
  }

  async sqlSearch(
    payload: SQLSearchRequest,
    { useKibanaContext = true }: ESSearchOptions = { useKibanaContext: true }
  ): Promise<SQLSearchResponse> {
    payload = sanitizeRequest(payload, [...allowedSQLSearchRequestKeys]);

    if (useKibanaContext) {
      // TODO: adjust request based on this.visSearchContext
      // eslint-disable-next-line no-console
      console.log(this.visSearchContext);
    }

    const response = await lastValueFrom(
      this.deps.data.search.search<SqlSearchStrategyRequest, SqlSearchStrategyResponse>(
        { params: payload },
        { strategy: SQL_SEARCH_STRATEGY }
      )
    );

    return response.rawResponse;
  }
}
