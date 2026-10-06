/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AggTypesDependencies } from '../../..';
export declare function inferTimeZone(
  params: {
    field?: DataViewField | string;
    time_zone?: string;
  },
  dataView: DataView,
  aggName: 'date_histogram' | 'date_range',
  getConfig: AggTypesDependencies['getConfig'],
  { shouldDetectTimeZone }?: AggTypesDependencies['aggExecutionContext']
): string;
