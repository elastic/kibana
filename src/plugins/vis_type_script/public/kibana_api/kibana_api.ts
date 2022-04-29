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
  getEsQueryConfig,
  getTime,
  SQL_SEARCH_STRATEGY,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
} from '@kbn/data-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { buildQueryFilter, compareFilters, Filter, buildEsQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/public';
import { VisSearchContext } from '../types';

export interface VisTypeScriptKibanaApiDeps {
  data: DataPublicPluginStart;
  uiSettingsClient: IUiSettingsClient;
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
  'size',
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
    payload: ESSearchRequest = {},
    { useKibanaContext = true, timeField }: ESSearchOptions = { useKibanaContext: true }
  ): Promise<ESSearchResponse> {
    payload = sanitizeRequest(payload, [...allowedESSearchRequestKeys]);

    if (useKibanaContext) {
      const esQuery = this.buildEsQuery({ timeField });

      // TODO: is there a better way to merge queries?
      if (!payload.query) payload.query = {};
      if (!payload.query.bool) payload.query.bool = {};
      if (payload.query.bool.must && !Array.isArray(payload.query.bool.must))
        payload.query.bool.must = [payload.query.bool.must];
      if (!payload.query.bool.must) payload.query.bool.must = [];
      payload.query.bool.must.push(esQuery);
    }

    const response = await lastValueFrom(
      this.deps.data.search.search({ params: payload }, { strategy: ENHANCED_ES_SEARCH_STRATEGY })
    );
    return response.rawResponse;
  }

  async sqlSearch(
    payload: SQLSearchRequest = {},
    { useKibanaContext = true, timeField }: ESSearchOptions = { useKibanaContext: true }
  ): Promise<SQLSearchResponse> {
    payload = sanitizeRequest(payload, [...allowedSQLSearchRequestKeys]);

    if (useKibanaContext) {
      const esQuery = this.buildEsQuery({ timeField });

      // TODO: is there a better way to merge queries?
      if (!payload.filter) payload.filter = {};
      if (!payload.filter.bool) payload.filter.bool = {};
      if (payload.filter.bool.must && !Array.isArray(payload.filter.bool.must))
        payload.filter.bool.must = [payload.filter.bool.must];
      if (!payload.filter.bool.must) payload.filter.bool.must = [];
      payload.filter.bool.must.push(esQuery);
    }

    const response = await lastValueFrom(
      this.deps.data.search.search<SqlSearchStrategyRequest, SqlSearchStrategyResponse>(
        { params: payload },
        { strategy: SQL_SEARCH_STRATEGY }
      )
    );

    return response.rawResponse;
  }

  async addFilter(query: any, index?: string, alias?: string) {
    const dataViewId = await this.getDataViewIdWithDefault(index);
    const newFilter = buildQueryFilter(query, dataViewId, alias);

    if (!!this.findMatchingFilter(newFilter)) return;

    this.deps.data.query.filterManager.addFilters(newFilter);
  }

  /**
   * Removes a filter matching the query and index if one exists
   * @param {object} query Elastic Query DSL snippet, as used in the query DSL editor
   * @param {string} [index] as defined in Kibana, or default if missing
   */
  async removeFilter(query: any, index?: string) {
    const indexId = await this.getDataViewIdWithDefault(index);
    const filterToRemove = buildQueryFilter(query, indexId);

    const existingFilter = this.findMatchingFilter(filterToRemove);

    if (!existingFilter) return;

    this.deps.data.query.filterManager.removeFilter(existingFilter);
  }

  /**
   * Removes all filters
   */
  removeAllFilters() {
    this.deps.data.query.filterManager.removeAll();
  }

  findMatchingFilter(filter: Filter) {
    const currentFilters = this.deps.data.query.filterManager.getFilters();
    return currentFilters.find((existing: Filter) => compareFilters(existing, filter));
  }

  /**
   * Find data view by its title, if not given, gets it from spec or a defaults one
   * @param {string} [index]
   * @returns {Promise<string>} data view id
   */
  async getDataViewIdWithDefault(index?: string): Promise<string> {
    const dataViews = this.deps.data.dataViews;
    let idxObj;

    if (index) {
      [idxObj] = await dataViews.find(index);
      if (!idxObj) {
        throw new Error(
          i18n.translate('visTypeVega.vegaParser.baseView.indexNotFoundErrorMessage', {
            defaultMessage: 'Index {index} not found',
            values: { index: `"${index}"` },
          })
        );
      }
    } else {
      if (!idxObj) {
        const defaultIdx = await dataViews.getDefault();

        if (defaultIdx) {
          idxObj = defaultIdx;
        } else {
          throw new Error(
            i18n.translate('visTypeVega.vegaParser.baseView.unableToFindDefaultIndexErrorMessage', {
              defaultMessage: 'Unable to find default index',
            })
          );
        }
      }
    }

    return idxObj.id as string;
  }

  /**
   * Builds es query for the search request using current this.visSearchContext
   * @param timeField
   * @private
   */
  private buildEsQuery({ timeField }: { timeField?: string }) {
    // TODO: add getNow() and getSearchSessionId()
    const query = this.visSearchContext.query ?? [];
    const filters = [...(this.visSearchContext.filters ?? [])];
    if (this.visSearchContext.timeRange && timeField) {
      // TODO: what is a proper way to build a filter from a time range without a data view?
      const stubDataView = {
        id: undefined,
        title: '',
        fields: [{ type: 'date', name: timeField }],
      };

      const timeFilter = getTime(stubDataView, this.visSearchContext.timeRange, {
        fieldName: timeField,
      });
      if (timeFilter) {
        // TODO: when we inside the viz editor there is already a time filter?
        // on top of the default data view and default time field.
        // who to handle this?
        filters.push(timeFilter);
      }
    }

    const esQuery = buildEsQuery(
      undefined,
      query,
      filters,
      getEsQueryConfig(this.deps.uiSettingsClient)
    );

    return esQuery;
  }
}
