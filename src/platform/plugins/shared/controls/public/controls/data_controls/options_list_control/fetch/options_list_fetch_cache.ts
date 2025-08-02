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

import {
  isOptionsListDSLRequest,
  type OptionsListFailureResponse,
  type OptionsListRequest,
  type OptionsListResponse,
  type OptionsListSuccessResponse,
} from '../../../../../common/options_list/types';
import { getESQLSingleColumnValues } from '../../common/get_esql_single_column_values';
import { getDSLFieldValues } from './get_dsl_field_values';

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
      ttl: REQUEST_CACHE_TTL,
    });
  }

  private getRequestHash = (request: OptionsListRequest) => {
    const { timeRange } = request;
    // round timeRange to the minute to avoid cache misses
    const roundedTimeRange = timeRange
      ? JSON.stringify({
          from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
          to: dateMath.parse(timeRange.to)!.endOf('minute').toISOString(),
        })
      : [];
    if (isOptionsListDSLRequest(request)) {
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
      const { query, searchString } = request;
      return hash({
        query,
        timeRange: roundedTimeRange,
        searchString,
      });
    }
  };

  public async runFetchRequest(
    request: OptionsListRequest,
    abortSignal: AbortSignal
  ): Promise<OptionsListResponse> {
    const requestHash = this.getRequestHash(request);

    if (this.cache.has(requestHash)) {
      return Promise.resolve(this.cache.get(requestHash)!);
    } else {
      if (isOptionsListDSLRequest(request)) {
        const result = await getDSLFieldValues({ request, abortSignal });

        if (!optionsListResponseWasFailure(result)) {
          // only add the success responses to the cache
          this.cache.set(requestHash, result);
        }
        return result;
      } else {
        const result = await getESQLSingleColumnValues({
          query: request.query.esql,
          timeRange: request.timeRange,
          abortSignal,
        });
        if (getESQLSingleColumnValues.isSuccess(result)) {
          // Run client-side search on ES|QL results
          // TODO: Add a named parameter to handle this natively in the ES|QL query
          const suggestions = result.values
            .filter(
              (value) =>
                // ES|QL searchTechnique is always 'wildcard'
                !request.searchString ||
                String(value).toLowerCase().includes(request.searchString.toLowerCase())
            )
            .map((value) => ({ value }));
          const response: OptionsListSuccessResponse = {
            suggestions,
            totalCardinality: suggestions.length,
            invalidSelections: request.selectedOptions?.filter(
              (selection) => !result.values.some((value) => value === selection)
            ),
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
