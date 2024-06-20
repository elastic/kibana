/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { lastValueFrom } from 'rxjs';

export async function getCount({
  abortSignal,
  data,
  dataView,
  filters,
  query,
  rangeFilter,
  timeRange,
}: {
  abortSignal: AbortSignal;
  data: DataPublicPluginStart;
  dataView: DataView;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  rangeFilter: Filter;
  timeRange?: TimeRange;
}): Promise<number | undefined> {
  const searchSource = await data.search.searchSource.create();
  searchSource.setField('size', 0);
  searchSource.setField('index', dataView);
  // Tracking total hits accurately has a performance cost
  // Setting 'trackTotalHits' to 1 since we just want to know 
  // "has results" or "not has results" vs the actual count
  searchSource.setField('trackTotalHits', 1);

  const allFilters = filters ? filters : [];
  allFilters.push(rangeFilter);
  if (timeRange) {
    const timeFilter = data.query.timefilter.timefilter.createFilter(dataView, timeRange);
    if (timeFilter) allFilters.push(timeFilter);
  }
  if (allFilters.length) {
    searchSource.setField('filter', allFilters);
  }

  if (query) {
    searchSource.setField('query', query);
  }

  const resp = await lastValueFrom(searchSource.fetch$({
    abortSignal,
    legacyHitsTotal: false,
  }));
  return resp?.rawResponse?.hits?.total?.value;
}
