/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom } from 'rxjs';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';

export async function getCount(
  dataView: DataView,
  dataService: DataPublicPluginStart,
  filters: Filter[],
  query: Query | AggregateQuery | undefined,
  timeRange: TimeRange | undefined
) {
  const searchSource = await dataService.search.searchSource.create();
  searchSource.setField('index', dataView);
  searchSource.setField('size', 0);
  searchSource.setField('trackTotalHits', true);
  const timeRangeFilter = timeRange
    ? dataService.query.timefilter.timefilter.createFilter(dataView, timeRange)
    : undefined;
  const allFilters = [...filters];
  if (timeRangeFilter) {
    allFilters.push(timeRangeFilter);
  }
  searchSource.setField('filter', allFilters);
  if (query) {
    searchSource.setField('query', query);
  }
  // eslint-disable-next-line no-console
  console.log('ES request', searchSource.getSearchRequestBody());

  const { rawResponse: resp } = await lastValueFrom(
    searchSource.fetch$({
      legacyHitsTotal: false,
    })
  );
  // eslint-disable-next-line no-console
  console.log('ES response', resp);
  const total = resp.hits.total as { value: number };
  return total?.value ?? 0;
}
