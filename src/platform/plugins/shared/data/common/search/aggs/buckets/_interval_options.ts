/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { IBucketAggConfig } from './bucket_agg_type';

export const autoInterval = 'auto';
export const isAutoInterval = (value: unknown) => value === autoInterval;

export const intervalOptions = [
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.autoDisplayName', {
      defaultMessage: 'Auto',
    }),
    val: autoInterval,
    enabled(agg: IBucketAggConfig) {
      // not only do we need a time field, but the selected field needs
      // to be the time field. (see #3028)
      return agg.fieldIsTimeField();
    },
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.millisecondDisplayName', {
      defaultMessage: 'Millisecond',
    }),
    val: 'ms',
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.secondDisplayName', {
      defaultMessage: 'Second',
    }),
    val: 's',
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.minuteDisplayName', {
      defaultMessage: 'Minute',
    }),
    val: 'm',
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.hourlyDisplayName', {
      defaultMessage: 'Hour',
    }),
    val: 'h',
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.dailyDisplayName', {
      defaultMessage: 'Day',
    }),
    val: 'd',
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.weeklyDisplayName', {
      defaultMessage: 'Week',
    }),
    val: 'w',
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.monthlyDisplayName', {
      defaultMessage: 'Month',
    }),
    val: 'M',
  },
  {
    display: i18n.translate('data.search.aggs.buckets.intervalOptions.yearlyDisplayName', {
      defaultMessage: 'Year',
    }),
    val: 'y',
  },
];
