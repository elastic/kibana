/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggTimeSeriesFnName } from './time_series_fn';
import { BaseAggParams } from '../types';

export { termsAggFilter } from './_terms_order_helper';

const timeSeriesTitle = i18n.translate('data.search.aggs.buckets.timeSeriesTitle', {
  defaultMessage: 'Time Series',
});

export type AggParamsTimeSeries = BaseAggParams;

export const getTimeSeriesBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.TIME_SERIES,
    expressionName: aggTimeSeriesFnName,
    title: timeSeriesTitle,
    params: [],
  });
