/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ES_FIELD_TYPES } from '../../../../types';
interface IntervalValuesRange {
  min: number;
  max: number;
}
export interface CalculateHistogramIntervalParams {
  interval: number | string;
  maxBucketsUiSettings: number;
  maxBucketsUserInput?: number | '';
  esTypes: ES_FIELD_TYPES[];
  intervalBase?: number;
  values?: IntervalValuesRange;
}
export declare const calculateHistogramInterval: ({
  interval,
  maxBucketsUiSettings,
  maxBucketsUserInput,
  intervalBase,
  values,
  esTypes,
}: CalculateHistogramIntervalParams) => number;
export {};
