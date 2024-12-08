/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { TimeBucketsInterval } from '../buckets/lib/time_buckets/time_buckets';
import { UI_SETTINGS } from '../../../constants';
import { TimeRange } from '../../../query';
import { TimeBuckets } from '../buckets/lib/time_buckets';
import { toAbsoluteDates } from './date_interval_utils';
import { autoInterval } from '../buckets/_interval_options';

export function getCalculateAutoTimeExpression(getConfig: (key: string) => any) {
  function calculateAutoTimeExpression(range: TimeRange): string | undefined;
  function calculateAutoTimeExpression(
    range: TimeRange,
    interval: string,
    expression?: true
  ): string | undefined;
  function calculateAutoTimeExpression(
    range: TimeRange,
    interval: string,
    expression: false
  ): TimeBucketsInterval | undefined;
  function calculateAutoTimeExpression(
    range: TimeRange,
    interval?: string,
    expression?: boolean
  ): string | TimeBucketsInterval | undefined;

  function calculateAutoTimeExpression(
    range: TimeRange,
    interval: string = autoInterval,
    expression: boolean = true
  ): string | TimeBucketsInterval | undefined {
    const dates = toAbsoluteDates(range);
    if (!dates) {
      return;
    }

    const buckets = new TimeBuckets({
      'histogram:maxBars': getConfig(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': getConfig(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: getConfig('dateFormat'),
      'dateFormat:scaled': getConfig('dateFormat:scaled'),
    });

    buckets.setInterval(interval);
    buckets.setBounds({
      min: moment(dates.from),
      max: moment(dates.to),
    });

    const intervalResult = buckets.getInterval();
    if (expression) {
      return intervalResult.expression;
    }
    return intervalResult;
  }

  return calculateAutoTimeExpression;
}
