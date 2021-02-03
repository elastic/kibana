/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DatatableColumn } from 'src/plugins/expressions/common';
import { IndexPattern } from '../../../index_patterns';

import { TimeRange } from '../../../types';
import { AggParamsDateHistogram, BUCKET_TYPES } from '../buckets';
import { inferTimeZone } from './infer_time_zone';

export interface DateMetaByColumnDeps {
  calculateAutoTimeExpression: (range: TimeRange) => string | undefined;
  getIndexPattern: (id: string) => Promise<IndexPattern>;
  isDefaultTimezone: () => boolean;
  getConfig: <T = any>(key: string) => T;
}

export const getDateMetaByDatatableColumn = ({
  calculateAutoTimeExpression,
  getIndexPattern,
  isDefaultTimezone,
  getConfig,
}: DateMetaByColumnDeps) => async (
  column: DatatableColumn
): Promise<undefined | { timeZone: string; timeRange?: TimeRange; interval: string }> => {
  if (column.meta.source !== 'esaggs') return;
  if (column.meta.sourceParams?.type !== BUCKET_TYPES.DATE_HISTOGRAM) return;
  const params = column.meta.sourceParams.params as AggParamsDateHistogram;
  const appliedTimeRange = column.meta.sourceParams.appliedTimeRange as TimeRange | undefined;

  const tz = inferTimeZone(
    params,
    await getIndexPattern(column.meta.sourceParams.indexPatternId as string),
    isDefaultTimezone,
    getConfig
  );

  const interval =
    params.interval === 'auto' && appliedTimeRange
      ? calculateAutoTimeExpression(appliedTimeRange)
      : params.interval;

  if (!interval || interval === 'auto') {
    throw new Error('time interval could not be determined');
  }

  return {
    timeZone: tz,
    timeRange: appliedTimeRange,
    interval,
  };
};
