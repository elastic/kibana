/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';

import dateMath from '@kbn/datemath';
import { CoreStart } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { buildEsQuery, type TimeRange } from '@kbn/es-query';
import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import {
  OptionsListRequest,
  OptionsListResponse,
  OptionsListRequestBody,
  OptionsListFailureResponse,
} from '../../../common/options_list/types';
import { ControlsHTTPService } from '../http/types';
import { ControlsDataService } from '../data/types';
import { ControlsPluginStartDeps } from '../../types';
import { ControlsOptionsListService } from './types';

class OptionsListService implements ControlsOptionsListService {
  private core: CoreStart;
  private data: ControlsDataService;
  private http: ControlsHTTPService;

  constructor(core: CoreStart, requiredServices: OptionsListServiceRequiredServices) {
    this.core = core;
    ({ data: this.data, http: this.http } = requiredServices);
  }

  private getRoundedTimeRange = (timeRange: TimeRange) => ({
    from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
    to: dateMath.parse(timeRange.to)!.endOf('minute').toISOString(),
  });

  private optionsListCacheResolver = (request: OptionsListRequest) => {
    const {
      size,
      sort,
      query,
      filters,
      timeRange,
      searchString,
      runPastTimeout,
      selectedOptions,
      searchTechnique,
      field: { name: fieldName },
      dataView: { title: dataViewTitle },
    } = request;
    return [
      ...(timeRange ? JSON.stringify(this.getRoundedTimeRange(timeRange)) : []), // round timeRange to the minute to avoid cache misses
      Math.floor(Date.now() / 1000 / 60), // Only cache results for a minute in case data changes in ES index
      selectedOptions?.join(','),
      JSON.stringify(filters),
      JSON.stringify(query),
      JSON.stringify(sort),
      searchTechnique,
      runPastTimeout,
      dataViewTitle,
      searchString,
      fieldName,
      size,
    ].join('|');
  };

  private cachedOptionsListRequest = memoize(
    async (request: OptionsListRequest, abortSignal: AbortSignal) => {
      const index = request.dataView.title;
      const requestBody = this.getRequestBody(request);
      return await this.http.fetch<OptionsListResponse>(`/internal/controls/optionsList/${index}`, {
        version: '1',
        body: JSON.stringify(requestBody),
        signal: abortSignal,
        method: 'POST',
      });
    },
    this.optionsListCacheResolver
  );

  private getRequestBody = (request: OptionsListRequest): OptionsListRequestBody => {
    const timeService = this.data.query.timefilter.timefilter;
    const { query, filters, dataView, timeRange, field, ...passThroughProps } = request;
    const timeFilter = timeRange ? timeService.createFilter(dataView, timeRange) : undefined;
    const filtersToUse = [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])];
    const config = getEsQueryConfig(this.core.uiSettings);
    const esFilters = [buildEsQuery(dataView, query ?? [], filtersToUse ?? [], config)];

    return {
      ...passThroughProps,
      filters: esFilters,
      fieldName: field.name,
      fieldSpec: field,
      runtimeFieldMap: dataView.toSpec().runtimeFieldMap,
    };
  };

  private cachedAllowExpensiveQueries = memoize(async () => {
    const { allowExpensiveQueries } = await this.http.get<{
      allowExpensiveQueries: boolean;
    }>('/internal/controls/optionsList/getExpensiveQueriesSetting', {
      version: '1',
    });
    return allowExpensiveQueries;
  });

  public getAllowExpensiveQueries = async (): Promise<boolean> => {
    try {
      return await this.cachedAllowExpensiveQueries();
    } catch (error) {
      return false;
    }
  };

  public optionsListResponseWasFailure = (
    response: OptionsListResponse
  ): response is OptionsListFailureResponse => {
    return (response as OptionsListFailureResponse).error !== undefined;
  };

  public runOptionsListRequest = async (request: OptionsListRequest, abortSignal: AbortSignal) => {
    try {
      return await this.cachedOptionsListRequest(request, abortSignal);
    } catch (error: any) {
      // Remove rejected results from memoize cache
      this.cachedOptionsListRequest.cache.delete(this.optionsListCacheResolver(request));
      if (error.name === 'AbortError') return { error: 'aborted' } as OptionsListFailureResponse;
      return { error } as OptionsListFailureResponse;
    }
  };

  public clearOptionsListCache = () => {
    this.cachedOptionsListRequest.cache = new memoize.Cache();
  };
}

export interface OptionsListServiceRequiredServices {
  data: ControlsDataService;
  http: ControlsHTTPService;
}

export type OptionsListServiceFactory = KibanaPluginServiceFactory<
  ControlsOptionsListService,
  ControlsPluginStartDeps,
  OptionsListServiceRequiredServices
>;

export const optionsListServiceFactory: OptionsListServiceFactory = (
  startParams,
  requiredServices
) => {
  return new OptionsListService(startParams.coreStart, requiredServices);
};
