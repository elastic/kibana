/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { AggTypesDependencies, DataViewField, DataView } from '../../..';

const DEFAULT_TIME_ZONE = 'UTC';

export const getConfigTimeZone = (
  getExecutionContext: AggTypesDependencies['getExecutionContext'],
  getConfig: AggTypesDependencies['getConfig']
) => {
  const configTimezone = getConfig<string>('dateFormat:tz');
  const isDefaultTimezone = configTimezone === 'Browser';

  if (isDefaultTimezone) {
    const { performedOn } = getExecutionContext();

    if (performedOn === 'server') {
      return DEFAULT_TIME_ZONE;
    }

    // If the typeMeta data index template does not have a timezone assigned to the selected field, use the configured tz
    const detectedTimezone = moment.tz.guess();
    const tzOffset = moment().format('Z');

    return detectedTimezone || tzOffset;
  }

  return configTimezone;
};

export function inferTimeZone(
  params: { field?: DataViewField | string; time_zone?: string },
  dataView: DataView,
  aggName: 'date_histogram' | 'date_range',
  getExecutionContext: AggTypesDependencies['getExecutionContext'],
  getConfig: AggTypesDependencies['getConfig']
) {
  let tz = params.time_zone;

  if (!tz && params.field) {
    // If a field has been configured check the index pattern's typeMeta if a date_histogram on that
    // field requires a specific time_zone
    const fieldName = typeof params.field === 'string' ? params.field : params.field.name;

    tz = dataView.typeMeta?.aggs?.[aggName]?.[fieldName]?.time_zone;
  }

  if (!tz) {
    const configTimezone = getConfig<string>('dateFormat:tz');
    const isDefaultTimezone = configTimezone === 'Browser';

    if (isDefaultTimezone) {
      return getConfigTimeZone(getExecutionContext, getConfig);
    }
  }

  return tz || DEFAULT_TIME_ZONE;
}
