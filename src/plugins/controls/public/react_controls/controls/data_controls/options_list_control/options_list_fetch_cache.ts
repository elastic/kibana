/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import LRUCache from 'lru-cache';
import hash from 'object-hash';

import dateMath from '@kbn/datemath';

import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { buildEsQuery } from '@kbn/es-query';
import {
  type OptionsListFailureResponse,
  type OptionsListRequest,
  type OptionsListResponse,
  type OptionsListSuccessResponse,
} from '../../../../../common/options_list/types';
import { DataControlServices } from '../types';

const REQUEST_CACHE_SIZE = 50; // only store a max of 50 responses
const REQUEST_CACHE_TTL = 1000 * 60; // time to live = 1 minute

const optionsListResponseWasFailure = (
  response: OptionsListResponse
): response is OptionsListFailureResponse => {
  return (response as OptionsListFailureResponse).error !== undefined;
};

export class OptionsListFetchCache {
  private cache: LRUCache<string, OptionsListSuccessResponse>;

  constructor() {
    this.cache = new LRUCache<string, OptionsListSuccessResponse>({
      max: REQUEST_CACHE_SIZE,
      maxAge: REQUEST_CACHE_TTL,
    });
  }

  private getRequestHash = (request: OptionsListRequest) => {
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
    return hash({
      // round timeRange to the minute to avoid cache misses
      timeRange: timeRange
        ? JSON.stringify({
            from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
            to: dateMath.parse(timeRange.to)!.endOf('minute').toISOString(),
          })
        : [],
      selectedOptions,
      filters,
      query,
      sort,
      searchTechnique,
      runPastTimeout,
      dataViewTitle,
      searchString: searchString ?? '',
      fieldName,
      size,
    });
  };

  public async runFetchRequest(
    request: OptionsListRequest,
    abortSignal: AbortSignal,
    services: DataControlServices
  ): Promise<OptionsListResponse> {
    const requestHash = this.getRequestHash(request);

    if (this.cache.has(requestHash)) {
      return Promise.resolve(this.cache.get(requestHash)!);
    } else {
      const index = request.dataView.getIndexPattern();

      const timeService = services.data.query.timefilter.timefilter;
      const { query, filters, dataView, timeRange, field, ...passThroughProps } = request;
      const timeFilter = timeRange ? timeService.createFilter(dataView, timeRange) : undefined;
      const filtersToUse = [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])];
      const config = getEsQueryConfig(services.core.uiSettings);
      const esFilters = [buildEsQuery(dataView, query ?? [], filtersToUse ?? [], config)];

      const requestBody = {
        ...passThroughProps,
        filters: esFilters,
        fieldName: field.name,
        fieldSpec: field,
        runtimeFieldMap: dataView.toSpec?.().runtimeFieldMap,
      };

      const result = await services.core.http.fetch<OptionsListResponse>(
        `/internal/controls/optionsList/${index}`,
        {
          version: '1',
          body: JSON.stringify(requestBody),
          signal: abortSignal,
          method: 'POST',
        }
      );

      if (!optionsListResponseWasFailure(result)) {
        // only add the success responses to the cache
        this.cache.set(requestHash, result);
      }
      return result;
    }
  }
}
