/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';
import dateMath from '@elastic/datemath';
import { buildEsQuery, Filter, Query } from '@kbn/es-query';

import { pluginServices } from '../../services';
import { TimeRange } from '../../../../data/public';
import { OptionsListRequestBody, OptionsListResponse } from './types';
import { DataView, DataViewField } from '../../../../data_views/public';

export type OptionsListRequest = Omit<
  OptionsListRequestBody,
  'filters' | 'fieldName' | 'fieldSpec'
> & {
  timeRange?: TimeRange;
  field: DataViewField;
  dataView: DataView;
  filters?: Filter[];
  query?: Query;
};

const { http, data } = pluginServices.getServices();
const timeService = data.query.timefilter.timefilter;

const getRoundedTimeRange = (timeRange: TimeRange) => ({
  from: dateMath.parse(timeRange.from)!.startOf('minute').toISOString(),
  to: dateMath.parse(timeRange.to)!.endOf('minute').toISOString(),
});

const optionsListCacheResolver = (request: OptionsListRequest) => {
  const {
    filters,
    timeRange,
    searchString,
    selectedOptions,
    field: { name: fieldName },
    dataView: { title: dataViewTitle },
  } = request;
  return [
    ...(timeRange ? JSON.stringify(getRoundedTimeRange(timeRange)) : []), // round timeRange to the minute to avoid cache misses
    Math.floor(Date.now() / 1000 / 60), // Only cache results for a minute in case data changes in ES index
    selectedOptions?.join(','),
    JSON.stringify(filters),
    dataViewTitle,
    searchString,
    fieldName,
  ].join('|');
};

const cachedOptionsListRequest = memoize(
  async (request: OptionsListRequest, abortSignal: AbortSignal) => {
    const index = request.dataView.title;
    const requestBody = getRequestBody(request);
    return await http.fetch<OptionsListResponse>(`/api/kibana/controls/optionsList/${index}`, {
      body: JSON.stringify(requestBody),
      signal: abortSignal,
      method: 'POST',
    });
  },
  optionsListCacheResolver
);

const getRequestBody = (request: OptionsListRequest): OptionsListRequestBody => {
  const { query, filters, dataView, timeRange, field, ...passThroughProps } = request;
  const timeFilter = timeRange ? timeService.createFilter(dataView, timeRange) : undefined;
  const filtersToUse = [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])];
  const esFilters = [buildEsQuery(dataView, query ?? [], filtersToUse ?? [])];
  return {
    ...passThroughProps,
    filters: esFilters,
    fieldName: field.name,
    fieldSpec: field.toSpec?.(),
  };
};

export const runOptionsListRequest = async (
  request: OptionsListRequest,
  abortSignal: AbortSignal
) => {
  try {
    return await cachedOptionsListRequest(request, abortSignal);
  } catch (error) {
    // Remove rejected results from memoize cache
    cachedOptionsListRequest.cache.delete(optionsListCacheResolver(request));
    return {} as OptionsListResponse;
  }
};
