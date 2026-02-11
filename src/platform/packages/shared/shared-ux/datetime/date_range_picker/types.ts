/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DATE_TYPE_ABSOLUTE, DATE_TYPE_RELATIVE, DATE_TYPE_NOW } from './constants';

export type DateType = typeof DATE_TYPE_ABSOLUTE | typeof DATE_TYPE_RELATIVE | typeof DATE_TYPE_NOW;

/** Elastic dataMath string or ISO 8601 yyyy-MM-ddTHH:mm:ss.SSSZ e.g. 2025-12-23T08:15:13Z */
export type DateString = string;

export interface TimeRangeBounds {
  end: DateString;
  start: DateString;
}

export interface TimeRangeBoundsPreset extends TimeRangeBounds {
  label: string;
}

export interface TimeRangeTransformOptions {
  presets?: TimeRangeBoundsPreset[];
  delimiter?: string;
  dateFormat?: string;
}

export interface TimeRange {
  value: string;
  start: DateString;
  end: DateString;
  startDate: Date | null;
  endDate: Date | null;
  type: [DateType, DateType];
  isNaturalLanguage: boolean;
  isInvalid: boolean;
}
