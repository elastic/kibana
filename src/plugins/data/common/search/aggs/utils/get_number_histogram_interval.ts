/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn } from 'src/plugins/expressions/common';
import type { AggParamsHistogram } from '../buckets';
import { BUCKET_TYPES } from '../buckets/bucket_agg_types';

const SEPARATOR = '$$$';

function parseSerializedInterval(interval: string | number) {
  if (typeof interval === 'number') {
    return interval;
  }
  if (interval === 'auto') {
    return 'auto';
  }
  return Number(interval.split(SEPARATOR)[1]);
}

export function buildSerializedAutoInterval(usedInterval: number) {
  return `auto${SEPARATOR}${usedInterval}`;
}

export function isSerializedAutoInterval(interval: string | number) {
  return typeof interval === 'string' && interval.startsWith('auto');
}

/**
 * Helper function returning the used interval for data table column created by the histogramm agg type.
 * "auto" will get expanded to the actually used interval.
 * If the column is not a column created by a histogram aggregation of the esaggs data source,
 * this function will return undefined.
 */
export const getNumberHistogramIntervalByDatatableColumn = (column: DatatableColumn) => {
  if (column.meta.source !== 'esaggs') return;
  if (column.meta.sourceParams?.type !== BUCKET_TYPES.HISTOGRAM) return;
  const params = (column.meta.sourceParams.params as unknown) as AggParamsHistogram;

  if (!params.interval) {
    return undefined;
  }
  return parseSerializedInterval(params.interval);
};
