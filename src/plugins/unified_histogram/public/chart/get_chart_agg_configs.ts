/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';

/**
 * Helper function to apply or remove aggregations to a given search source used for gaining data
 * for Discover's histogram vis
 */
export function getChartAggConfigs(
  dataView: DataView,
  timeInterval: string,
  data: DataPublicPluginStart
) {
  const visStateAggs = [
    {
      type: 'count',
      schema: 'metric',
    },
    {
      type: 'date_histogram',
      schema: 'segment',
      params: {
        field: dataView.timeFieldName!,
        interval: timeInterval,
        timeRange: data.query.timefilter.timefilter.getTime(),
      },
    },
  ];
  return data.search.aggs.createAggConfigs(dataView, visStateAggs);
}
