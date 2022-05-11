/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { AggParamsHistogram } from '../buckets';
import { BUCKET_TYPES } from '../buckets/bucket_agg_types';

/**
 * Helper function returning the used interval for data table column created by the histogramm agg type.
 * "auto" will get expanded to the actually used interval.
 * If the column is not a column created by a histogram aggregation of the esaggs data source,
 * this function will return undefined.
 */
export const getNumberHistogramIntervalByDatatableColumn = (column: DatatableColumn) => {
  if (column.meta.source !== 'esaggs') return;
  if (column.meta.sourceParams?.type !== BUCKET_TYPES.HISTOGRAM) return;
  const params = column.meta.sourceParams.params as unknown as AggParamsHistogram;

  if (!params.used_interval || typeof params.used_interval === 'string') {
    return undefined;
  }
  return params.used_interval;
};
