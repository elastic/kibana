/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import hash from 'object-hash';

import dateMath from '@kbn/datemath';

import type {
  OptionsListFailureResponse,
  OptionsListRequest,
  OptionsListResponse,
  OptionsListSuccessResponse,
} from '../../../../../common/options_list/types';
import {
  GetESQLSingleColumnValuesParams,
  getESQLSingleColumnValues,
} from '../../common/get_esql_single_column_values';
import { getDSLFieldValues } from './get_dsl_field_values';

const REQUEST_CACHE_SIZE = 50; // only store a max of 50 responses
const REQUEST_CACHE_TTL = 1000 * 60; // time to live = 1 minute

const optionsListResponseWasFailure = (
  response: OptionsListResponse
): response is OptionsListFailureResponse => {
  return (response as OptionsListFailureResponse).error !== undefined;
};

const isDSLRequest = (request: unknown): request is OptionsListRequest => {
  const req = request as OptionsListRequest;
  return Object.hasOwn(req, 'dataView') && Object.hasOwn(req, 'field');
};

export class OptionsListFetchCache {
  private cache: LRUCache<string, OptionsListSuccessResponse>;

  static isSuccessResponse = (
    response: OptionsListResponse
  ): response is OptionsListSuccessResponse => Object.hasOwn(response, 'suggestions');

  constructor() {
    this.cache = new LRUCache<string, OptionsListSuccessResponse>({
      max: REQUEST_CACHE_SIZE,
      ttl: REQUEST_CACHE_TTL,
    });
  }

  private getRequestHash = (request: OptionsListRequest | GetESQLSingleColumnValuesParams) => {
    const { timeRange } = request;
    // round timeRange to the minute to avoid cache misses
    const roundedTimeRange = timeRange
      ? JSON.stringify({
          from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
          to: dateMath.parse(timeRange.to)!.endOf('minute').toISOString(),
        })
      : [];
    if (isDSLRequest(request)) {
      const {
        size,
        sort,
        query,
        filters,
        searchString,
        runPastTimeout,
        selectedOptions,
        searchTechnique,
        ignoreValidations,
        field: { name: fieldName },
        dataView: { title: dataViewTitle },
      } = request;
      return hash({
        timeRange: roundedTimeRange,
        selectedOptions,
        filters,
        query,
        sort,
        searchTechnique,
        ignoreValidations,
        runPastTimeout,
        dataViewTitle,
        searchString: searchString ?? '',
        fieldName,
        size,
      });
    } else {
      const { query } = request;
      return hash({
        query,
        timeRange: roundedTimeRange,
      });
    }
  };

  public async runFetchRequest(
    request: OptionsListRequest | GetESQLSingleColumnValuesParams,
    abortSignal: AbortSignal
  ): Promise<OptionsListResponse> {
    const requestHash = this.getRequestHash(request);

    if (this.cache.has(requestHash)) {
      return Promise.resolve(this.cache.get(requestHash)!);
    } else {
      if (isDSLRequest(request)) {
        const result = await getDSLFieldValues({ request, abortSignal });

        if (!optionsListResponseWasFailure(result)) {
          // only add the success responses to the cache
          this.cache.set(requestHash, result);
        }
        return result;
      } else {
        const result = await getESQLSingleColumnValues(request);
        if (getESQLSingleColumnValues.isSuccess(result)) {
          const response: OptionsListSuccessResponse = {
            suggestions: result.values.map((value) => ({ value })),
            totalCardinality: result.values.length,
          };
          this.cache.set(requestHash, response);
          return response;
        }
        return result;
      }
    }
  }

  public clearCache = () => {
    this.cache.clear();
  };
}
