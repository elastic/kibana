/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Moment } from 'moment';

export enum Frequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
  HOURLY = 4,
  MINUTELY = 5,
  SECONDLY = 6,
}

export enum Weekday {
  MO = 1,
  TU = 2,
  WE = 3,
  TH = 4,
  FR = 5,
  SA = 6,
  SU = 7,
}

export type WeekdayStr = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export interface IterOptions {
  refDT: Moment;
  wkst?: Weekday | number | null;
  byyearday?: number[] | null;
  bymonth?: number[] | null;
  bysetpos?: number[] | null;
  bymonthday?: number[] | null;
  byweekday?: Weekday[] | null;
  byhour?: number[] | null;
  byminute?: number[] | null;
  bysecond?: number[] | null;
}

export type Options = Omit<IterOptions, 'refDT'> & {
  dtstart: Date;
  freq?: Frequency;
  interval?: number;
  until?: Date | null;
  count?: number;
  tzid: string;
};

export type ConstructorOptions = Omit<Options, 'byweekday' | 'wkst'> & {
  byweekday?: Array<string | number> | null;
  wkst?: Weekday | WeekdayStr | number | null;
};
