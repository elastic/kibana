/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SearchSource } from '../../../../../../data/common';
import { DataPublicPluginStart } from '../../../../../../data/public';

/**
 * Helper function to apply or remove aggregations to a given search source used for gaining data
 * for Discover's histogram vis
 */
export function getChartAggConfigs(
  searchSource: SearchSource,
  histogramInterval: string,
  data: DataPublicPluginStart
) {
  const indexPattern = searchSource.getField('index')!;
  const visStateAggs = [
    {
      type: 'count',
      schema: 'metric',
    },
    {
      type: 'date_histogram',
      schema: 'segment',
      params: {
        field: indexPattern.timeFieldName!,
        interval: histogramInterval,
        timeRange: data.query.timefilter.timefilter.getTime(),
      },
    },
  ];
  return data.search.aggs.createAggConfigs(indexPattern, visStateAggs);
}
