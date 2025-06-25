/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Moment } from 'moment';
import { Frequency } from '@kbn/rrule';
import { ISO_WEEKDAYS_TO_RRULE } from '../constants';
import { getPresets } from './get_presets';
import { parseSchedule } from './parse_schedule';
import { getNthByWeekday } from './get_nth_by_weekday';
import type { RRuleParams, RecurringSchedule } from '../types';

export const convertToRRule = ({
  startDate,
  timezone,
  recurringSchedule,
  includeTime = false,
}: {
  startDate: Moment;
  timezone: string;
  recurringSchedule?: RecurringSchedule;
  includeTime?: boolean;
}): RRuleParams => {
  const presets = getPresets(startDate);

  const parsedSchedule = parseSchedule(recurringSchedule);

  const rRule: RRuleParams = {
    dtstart: startDate.toISOString(),
    tzid: timezone,
    ...(Boolean(includeTime)
      ? { byhour: [startDate.get('hour')], byminute: [startDate.get('minute')] }
      : {}),
  };

  if (!parsedSchedule)
    return {
      ...rRule,
      // default to yearly and a count of 1
      // if the maintenance window is not recurring
      freq: Frequency.YEARLY,
      count: 1,
    };

  let form = parsedSchedule;
  if (parsedSchedule.frequency !== 'CUSTOM') {
    form = { ...parsedSchedule, ...presets[parsedSchedule.frequency] };
  }

  const frequency = form.customFrequency ?? (form.frequency as Frequency);
  rRule.freq = frequency;

  rRule.interval = form.interval;

  if (form.until) {
    rRule.until = form.until;
  }

  if (form.count) {
    rRule.count = form.count;
  }

  if (form.byweekday) {
    const byweekday = form.byweekday;
    rRule.byweekday = Object.keys(byweekday)
      .filter((k) => byweekday[k] === true)
      .map((n) => ISO_WEEKDAYS_TO_RRULE[Number(n)]);
  }

  if (form.bymonth) {
    if (form.bymonth === 'day') {
      rRule.bymonthday = [startDate.date()];
    } else if (form.bymonth === 'weekday') {
      rRule.byweekday = [getNthByWeekday(startDate)];
    }
  }

  if (frequency === Frequency.YEARLY) {
    // rRule expects 1 based indexing for months
    rRule.bymonth = [startDate.month() + 1];
    rRule.bymonthday = [startDate.date()];
  }

  return rRule;
};
