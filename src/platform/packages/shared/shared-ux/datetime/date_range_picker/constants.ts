/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DATE_TYPE_ABSOLUTE = 'ABSOLUTE' as const;
export const DATE_TYPE_RELATIVE = 'RELATIVE' as const;
export const DATE_TYPE_NOW = 'NOW' as const;

export const DEFAULT_DATE_FORMAT = 'MMM D YYYY, HH:mm';
export const FORMAT_TIME_ONLY = 'HH:mm';
export const FORMAT_NO_YEAR = 'MMM D, HH:mm';

export const DATE_RANGE_INPUT_DELIMITER = 'to';
export const DATE_RANGE_DISPLAY_DELIMITER = '→';

export const UNIT_SHORT_TO_FULL_MAP: Record<string, string> = {
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

export const UNIT_FULL_TO_SHORT_MAP: Record<string, string> = Object.entries(
  UNIT_SHORT_TO_FULL_MAP
).reduce((acc, [short, full]) => {
  acc[full] = short;
  acc[`${full}s`] = short;
  return acc;
}, {} as Record<string, string>);
