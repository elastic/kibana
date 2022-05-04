/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { TimeRange } from '../../../types';
import type { AggParamsDateHistogram } from '../buckets';
import { BUCKET_TYPES } from '../buckets/bucket_agg_types';

/**
 * Helper function returning the used interval, used time zone and applied time filters for data table column created by the date_histogramm agg type.
 * "auto" will get expanded to the actually used interval.
 * If the column is not a column created by a date_histogram aggregation of the esaggs data source,
 * this function will return undefined.
 */
export const getDateHistogramMetaDataByDatatableColumn = (
  column: DatatableColumn,
  defaults: Partial<{
    timeZone: string;
  }> = {}
) => {
  if (column.meta.source !== 'esaggs') return;
  if (column.meta.sourceParams?.type !== BUCKET_TYPES.DATE_HISTOGRAM) return;
  const params = column.meta.sourceParams.params as unknown as AggParamsDateHistogram;

  let interval: string | undefined;
  if (params.used_interval && params.used_interval !== 'auto') {
    interval = params.used_interval;
  }

  return {
    interval,
    timeZone: params.used_time_zone || defaults.timeZone,
    timeRange: column.meta.sourceParams.appliedTimeRange as TimeRange | undefined,
  };
};
