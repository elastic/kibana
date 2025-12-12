/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

import { Frequency } from '@kbn/rrule';
import { getPresets } from './get_presets';
import { recurringSummary } from './recurring_summary';

describe('convertToRRule', () => {
  const today = '2023-03-22';
  const startDate = moment(today);
  const presets = getPresets(startDate);

  test('should return an empty string if the form is undefined', () => {
    const summary = recurringSummary({ startDate, presets });

    expect(summary).toEqual('');
  });

  test('should return the summary for maintenance window that is recurring on a daily schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
        ends: 'never',
        frequency: Frequency.DAILY,
      },
      presets,
    });

    expect(summary).toEqual('every Wednesday');
  });

  test('should return the summary for maintenance window that is recurring on a daily schedule until', () => {
    const until = moment(today).add(1, 'month').toISOString();
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
        ends: 'until',
        until,
        frequency: Frequency.DAILY,
      },
      presets,
    });

    expect(summary).toEqual('every Wednesday until April 22, 2023');
  });

  test('should return the summary for maintenance window that is recurring on a daily schedule after x', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
        ends: 'afterx',
        count: 3,
        frequency: Frequency.DAILY,
      },
      presets,
    });

    expect(summary).toEqual('every Wednesday for 3 occurrences');
  });

  test('should return the summary for maintenance window that is recurring on a weekly schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        ends: 'never',
        frequency: Frequency.WEEKLY,
      },
      presets,
    });

    expect(summary).toEqual('every week on Wednesday');
  });

  test('should return the summary for maintenance window that is recurring on a monthly schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        ends: 'never',
        frequency: Frequency.MONTHLY,
      },
      presets,
    });

    expect(summary).toEqual('every month on the 4th Wednesday');
  });

  test('should return the summary for maintenance window that is recurring on a yearly schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        ends: 'never',
        frequency: Frequency.YEARLY,
      },
      presets,
    });

    expect(summary).toEqual('every year on March 22');
  });

  test('should return the summary for maintenance window that is recurring on a custom daily schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        customFrequency: Frequency.DAILY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 1,
      },
      presets,
    });

    expect(summary).toEqual('every day');
  });

  test('should return the summary for maintenance window that is recurring on a custom weekly schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: true, 5: false, 6: false, 7: false },
        customFrequency: Frequency.WEEKLY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 1,
      },
      presets,
    });

    expect(summary).toEqual('every week on Wednesday, Thursday');
  });

  test('should return the summary for maintenance window that is recurring on a custom monthly by day schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        bymonth: 'day',
        customFrequency: Frequency.MONTHLY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 1,
      },
      presets,
    });

    expect(summary).toEqual('every month on day 22');
  });

  test('should return the summary for maintenance window that is recurring on a custom monthly by weekday schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        bymonth: 'weekday',
        customFrequency: Frequency.MONTHLY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 1,
      },
      presets,
    });

    expect(summary).toEqual('every month on the 4th Wednesday');
  });

  test('should return the summary for maintenance window that is recurring on a custom yearly schedule', () => {
    const summary = recurringSummary({
      startDate,
      recurringSchedule: {
        customFrequency: Frequency.YEARLY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 3,
      },
      presets,
    });

    expect(summary).toEqual('every 3 years on March 22');
  });
});
