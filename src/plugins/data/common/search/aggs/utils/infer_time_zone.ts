/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { IndexPattern } from '../../../index_patterns';
import { AggParamsDateHistogram } from '../buckets';

export function inferTimeZone(
  params: AggParamsDateHistogram,
  indexPattern: IndexPattern,
  isDefaultTimezone: () => boolean,
  getConfig: <T = any>(key: string) => T
) {
  let tz = params.time_zone;
  if (!tz && params.field) {
    // If a field has been configured check the index pattern's typeMeta if a date_histogram on that
    // field requires a specific time_zone
    const fieldName = typeof params.field === 'string' ? params.field : params.field.name;
    tz = indexPattern.typeMeta?.aggs?.date_histogram?.[fieldName]?.time_zone;
  }
  if (!tz) {
    // If the index pattern typeMeta data, didn't had a time zone assigned for the selected field use the configured tz
    const detectedTimezone = moment.tz.guess();
    const tzOffset = moment().format('Z');
    tz = isDefaultTimezone()
      ? detectedTimezone || tzOffset
      : // if timezone is not the default, this will always return a string
        (getConfig('dateFormat:tz') as string);
  }
  return tz;
}
