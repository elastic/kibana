/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Options } from './types';
export declare function sanitizeOptions(opts: Options): {
  wkst?: (import('./types').Weekday | number | null) | undefined;
  byyearday?: number[] | null | undefined;
  bymonth?: number[] | null | undefined;
  bysetpos?: number[] | null | undefined;
  bymonthday?: number[] | null | undefined;
  byweekday?: import('./types').Weekday[] | null | undefined;
  byhour?: number[] | null | undefined;
  byminute?: number[] | null | undefined;
  bysecond?: number[] | null | undefined;
  dtstart: Date;
  freq?: import('./types').Frequency;
  interval?: number;
  until?: Date | null;
  count?: number;
  tzid: string;
};
