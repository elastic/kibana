/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';

import { toMS } from '../../../common/lib/to_milliseconds';

export default function validateTime(time, tlConfig) {
  const span = moment.duration(moment(time.to).diff(moment(time.from))).asMilliseconds();
  const interval = toMS(time.interval);
  const bucketCount = span / interval;
  const maxBuckets = tlConfig.settings['timelion:max_buckets'];
  if (bucketCount > maxBuckets) {
    throw new Error(
      i18n.translate('timelion.serverSideErrors.bucketsOverflowErrorMessage', {
        defaultMessage:
          'Max buckets exceeded: {bucketCount} of {maxBuckets} allowed. ' +
          'Choose a larger interval or a shorter time span',
        values: {
          bucketCount: Math.round(bucketCount),
          maxBuckets,
        },
      })
    );
  }
  return true;
}
