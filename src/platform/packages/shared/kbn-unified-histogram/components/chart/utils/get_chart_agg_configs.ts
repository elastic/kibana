/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';

/**
 * Helper function to get the agg configs required for the Unified Histogram chart request
 */
export function getChartAggConfigs({
  dataView,
  timeInterval,
  timeRange,
  data,
}: {
  dataView: DataView;
  timeInterval: string;
  timeRange: TimeRange;
  data: DataPublicPluginStart;
}) {
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
        timeRange,
      },
    },
  ];
  return data.search.aggs.createAggConfigs(dataView, visStateAggs);
}
