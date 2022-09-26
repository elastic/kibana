/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AggTypesDependencies } from '../../..';
import { getUserTimeZone } from '../../utils';

export function inferTimeZone(
  params: { field?: DataViewField | string; time_zone?: string },
  dataView: DataView,
  aggName: 'date_histogram' | 'date_range',
  getConfig: AggTypesDependencies['getConfig'],
  { shouldDetectTimeZone }: AggTypesDependencies['aggExecutionContext'] = {}
) {
  let tz = params.time_zone;

  if (!tz && params.field) {
    // If a field has been configured check the index pattern's typeMeta if a date_histogram on that
    // field requires a specific time_zone
    const fieldName = typeof params.field === 'string' ? params.field : params.field.name;

    tz = dataView.typeMeta?.aggs?.[aggName]?.[fieldName]?.time_zone;
  }

  if (!tz) {
    return getUserTimeZone(getConfig, shouldDetectTimeZone);
  }

  return tz;
}
