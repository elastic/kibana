/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type moment from 'moment-timezone';
import type { ConstructorOptions, Frequency } from './types';
import { type IterOptions } from './types';
type AllResult = Date[] & {
  hasMore?: boolean;
};
export declare class RRule {
  private options;
  constructor(options: ConstructorOptions);
  private dateset;
  between(start: Date, end: Date): Date[];
  before(dt: Date): Date;
  after(dt: Date): Date | null;
  all(limit?: number): AllResult;
  static isValid(options: ConstructorOptions): boolean;
}
export declare const getNextRecurrences: ({
  refDT,
  wkst,
  byyearday,
  bymonth,
  bymonthday,
  byweekday,
  byhour,
  byminute,
  bysecond,
  bysetpos,
  freq,
  interval,
}: IterOptions & {
  freq?: Frequency;
  interval?: number;
}) => moment.Moment[];
export {};
