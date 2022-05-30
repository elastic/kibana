/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { AggTypesDependencies, IndexPattern } from '../../..';
import { AggParamsDateHistogram } from '../buckets';

export function inferTimeZone(
  params: AggParamsDateHistogram,
  indexPattern: IndexPattern,
  aggName: 'date_histogram' | 'date_range',
  getExecutionContext: AggTypesDependencies['getExecutionContext'],
  getConfig: AggTypesDependencies['getConfig']
): string {
  let tz = params.time_zone;

  if (!tz && params.field) {
    // If a field has been configured check the index pattern's typeMeta if a date_histogram on that
    // field requires a specific time_zone
    const fieldName = typeof params.field === 'string' ? params.field : params.field.name;

    tz = indexPattern.typeMeta?.aggs?.[aggName]?.[fieldName]?.time_zone;
  }

  if (!tz) {
    const configTimezone = getConfig<string>('dateFormat:tz');
    const isDefaultTimezone = configTimezone === 'Browser';

    if (isDefaultTimezone) {
      const { performedOn } = getExecutionContext();

      if (performedOn === 'server') {
        return 'UTC';
      }

      // If the typeMeta data index template does not have a timezone assigned to the selected field, use the configured tz
      const detectedTimezone = moment.tz.guess();
      const tzOffset = moment().format('Z');

      return detectedTimezone || tzOffset;
    }

    return configTimezone;
  }

  return tz;
}
