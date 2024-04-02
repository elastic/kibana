/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { padStart } from 'lodash';

import { EuiSelectOption } from '@elastic/eui';

import { DayOrdinal, MonthOrdinal, getOrdinalValue, getDayName, getMonthName } from './services';
import { Frequency, Field, FieldToValueMap } from '../../types/cron_editor';

type FieldFlags = {
  [key in Field]?: boolean;
};

function makeSequence(min: number, max: number): number[] {
  const values = [];
  for (let i = min; i <= max; i++) {
    values.push(i);
  }
  return values;
}

export const EVERY_MINUTE_OPTIONS = [
  {
    text: '5',
    value: '0,5,10,15,20,25,30,35,40,45,50,55',
  },
  {
    text: '10',
    value: '0,10,20,30,40,50',
  },
  {
    text: '15',
    value: '0,15,30,45',
  },
  {
    text: '30',
    value: '0,30',
  },
];

export const MINUTE_OPTIONS = makeSequence(0, 59).map((value) => ({
  value: value.toString(),
  text: padStart(value.toString(), 2, '0'),
}));

export const HOUR_OPTIONS = makeSequence(0, 23).map((value) => ({
  value: value.toString(),
  text: padStart(value.toString(), 2, '0'),
}));

export const DAY_OPTIONS = makeSequence(1, 7).map((value) => ({
  value: value.toString(),
  text: getDayName((value - 1) as DayOrdinal),
}));

export const DATE_OPTIONS = makeSequence(1, 31).map((value) => ({
  value: value.toString(),
  text: getOrdinalValue(value),
}));

export const MONTH_OPTIONS = makeSequence(1, 12).map((value) => ({
  value: value.toString(),
  text: getMonthName((value - 1) as MonthOrdinal),
}));

export const UNITS: EuiSelectOption[] = [
  {
    value: 'MINUTE',
    text: 'minute',
  },
  {
    value: 'HOUR',
    text: 'hour',
  },
  {
    value: 'DAY',
    text: 'day',
  },
  {
    value: 'WEEK',
    text: 'week',
  },
  {
    value: 'MONTH',
    text: 'month',
  },
  {
    value: 'YEAR',
    text: 'year',
  },
];

export const frequencyToFieldsMap: Record<Frequency, FieldFlags> = {
  MINUTE: { minute: true },
  HOUR: {
    minute: true,
  },
  DAY: {
    hour: true,
    minute: true,
  },
  WEEK: {
    day: true,
    hour: true,
    minute: true,
  },
  MONTH: {
    date: true,
    hour: true,
    minute: true,
  },
  YEAR: {
    month: true,
    date: true,
    hour: true,
    minute: true,
  },
};

export const frequencyToBaselineFieldsMap: Record<Frequency, FieldToValueMap> = {
  MINUTE: {
    second: '0',
    minute: '0,5,10,15,20,25,30,35,40,45,50,55',
    hour: '*',
    date: '*',
    month: '*',
    day: '?',
  },
  HOUR: {
    second: '0',
    minute: '0',
    hour: '*',
    date: '*',
    month: '*',
    day: '?',
  },
  DAY: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '*',
    month: '*',
    day: '?',
  },
  WEEK: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '?',
    month: '*',
    day: '7',
  },
  MONTH: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '1',
    month: '*',
    day: '?',
  },
  YEAR: {
    second: '0',
    minute: '0',
    hour: '0',
    date: '1',
    month: '1',
    day: '?',
  },
};
