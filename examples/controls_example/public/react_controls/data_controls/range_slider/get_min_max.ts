/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { lastValueFrom } from 'rxjs';

export async function getMinMax({
  abortSignal,
  data,
  dataView,
  field,
  filters,
  query,
  timeRange,
}: {
  abortSignal: AbortSignal;
  data: DataPublicPluginStart;
  dataView: DataView;
  field: DataViewField;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
}): Promise<{ min?: number; max?: number }> {
  const searchSource = await data.search.searchSource.create();
  searchSource.setField('size', 0);
  searchSource.setField('index', dataView);

  const allFilters = filters ? filters : [];
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

  const aggBody: any = {};
  if (field.scripted) {
    aggBody.script = {
      source: field.script,
      lang: field.lang,
    };
  } else {
    aggBody.field = field.name;
  }

  const aggs = {
    maxAgg: {
      max: aggBody,
    },
    minAgg: {
      min: aggBody,
    },
  };
  searchSource.setField('aggs', aggs);

  const resp = await lastValueFrom(searchSource.fetch$({ abortSignal }));
  return {
    min: resp.rawResponse?.aggregations?.minAgg?.value,
    max: resp.rawResponse?.aggregations?.maxAgg?.value,
  };
}
