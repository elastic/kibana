/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { UI_SETTINGS } from '../../../constants';
import { TimeRange } from '../../../query';
import { TimeBuckets } from '../buckets/lib/time_buckets';
import { toAbsoluteDates } from './date_interval_utils';
import { autoInterval } from '../buckets/_interval_options';

export function getCalculateAutoTimeExpression(getConfig: (key: string) => any) {
  return function calculateAutoTimeExpression(range: TimeRange) {
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

    buckets.setInterval(autoInterval);
    buckets.setBounds({
      min: moment(dates.from),
      max: moment(dates.to),
    });

    return buckets.getInterval().expression;
  };
}
