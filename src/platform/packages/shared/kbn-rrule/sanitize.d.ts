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
  wkst?: import('@kbn/task-manager-plugin/server').Weekday | number | null;
  byyearday?: number[] | null;
  bymonth?: number[] | null;
  bysetpos?: number[] | null;
  bymonthday?: number[] | null;
  byweekday?: import('@kbn/task-manager-plugin/server').Weekday[] | null;
  byhour?: number[] | null;
  byminute?: number[] | null;
  bysecond?: number[] | null;
  dtstart: Date;
  freq?: import('@kbn/task-manager-plugin/server').Frequency;
  interval?: number;
  until?: Date | null;
  count?: number;
  tzid: string;
};
