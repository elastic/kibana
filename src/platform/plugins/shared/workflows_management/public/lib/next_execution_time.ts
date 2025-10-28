/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any, complexity */

import { Frequency, RRule, Weekday } from '@kbn/rrule';
import type { WorkflowExecutionHistoryModel } from '@kbn/workflows';
import { parseIntervalString, type WorkflowTrigger } from '../../server/lib/schedule_utils';

/**
 * Calculates the next execution time for a scheduled trigger
 */
export function calculateNextExecutionTime(
  trigger: WorkflowTrigger,
  lastRun: Date | null
): Date | null {
  if (trigger.type !== 'scheduled') {
    return null;
  }

  const config = trigger.with || {};

  // Handle RRule-based scheduling
  if (config.rrule) {
    return calculateRRuleNextExecution(config.rrule, lastRun);
  }

  // Handle interval-based scheduling format (e.g., every: "5m")
  if (config.every && typeof config.every === 'string') {
    const parsed = parseIntervalString(config.every);
    if (parsed) {
      return calculateIntervalNextExecution(parsed.value, parsed.unit, lastRun);
    }
  }

  return null;
}

/**
 * Calculates next execution time for RRule-based schedules
 */
function calculateRRuleNextExecution(rruleConfig: any, lastRun: Date | null): Date | null {
  try {
    // Validate required fields
    if (!rruleConfig.freq || !rruleConfig.interval || !rruleConfig.tzid) {
      return null;
    }

    // Convert frequency string to enum
    const frequencyMap: Record<string, Frequency> = {
      DAILY: Frequency.DAILY,
      WEEKLY: Frequency.WEEKLY,
      MONTHLY: Frequency.MONTHLY,
    };

    const freq = frequencyMap[rruleConfig.freq];
    if (!freq) {
      return null;
    }

    // Build the RRule options
    const rruleOptions: any = {
      freq,
      interval: rruleConfig.interval,
      tzid: rruleConfig.tzid,
    };

    // Add dtstart - required by RRule library
    if (rruleConfig.dtstart) {
      const dtstart = new Date(rruleConfig.dtstart);
      if (!isNaN(dtstart.getTime())) {
        rruleOptions.dtstart = dtstart;
      } else {
        // Use current time as fallback if dtstart is invalid
        rruleOptions.dtstart = new Date();
      }
    } else if (lastRun) {
      rruleOptions.dtstart = lastRun;
    } else {
      // Use current time as default dtstart
      rruleOptions.dtstart = new Date();
    }

    if (rruleConfig.byhour && Array.isArray(rruleConfig.byhour) && rruleConfig.byhour.length > 0) {
      rruleOptions.byhour = rruleConfig.byhour;
    }

    if (
      rruleConfig.byminute &&
      Array.isArray(rruleConfig.byminute) &&
      rruleConfig.byminute.length > 0
    ) {
      rruleOptions.byminute = rruleConfig.byminute;
    }

    if (
      rruleConfig.byweekday &&
      Array.isArray(rruleConfig.byweekday) &&
      rruleConfig.byweekday.length > 0
    ) {
      // Convert weekday strings to Weekday enum values
      const weekdayMap: Record<string, Weekday> = {
        MO: Weekday.MO,
        TU: Weekday.TU,
        WE: Weekday.WE,
        TH: Weekday.TH,
        FR: Weekday.FR,
        SA: Weekday.SA,
        SU: Weekday.SU,
      };

      const weekdays = rruleConfig.byweekday
        .map((day: string) => weekdayMap[day.toUpperCase()])
        .filter(Boolean);

      if (weekdays.length > 0) {
        rruleOptions.byweekday = weekdays;
      }
    }

    if (
      rruleConfig.bymonthday &&
      Array.isArray(rruleConfig.bymonthday) &&
      rruleConfig.bymonthday.length > 0
    ) {
      rruleOptions.bymonthday = rruleConfig.bymonthday;
    }

    const rrule = new RRule(rruleOptions);
    const now = new Date();

    // Get the next occurrence after now
    const nextOccurrence = rrule.after(now);
    return nextOccurrence;
  } catch (error) {
    return null;
  }
}

/**
 * Calculates next execution time for interval-based schedules
 */
function calculateIntervalNextExecution(
  every: string | number,
  unit: string,
  lastRun: Date | null
): Date | null {
  try {
    const interval = parseInt(String(every), 10);
    if (isNaN(interval) || interval < 1) {
      return null;
    }

    const now = lastRun || new Date();
    const unitMap: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const unitMs = unitMap[unit.toLowerCase()];
    if (!unitMs) {
      return null;
    }

    const intervalMs = interval * unitMs;
    return new Date(now.getTime() + intervalMs);
  } catch (error) {
    return null;
  }
}

/**
 * Gets the next execution time for all scheduled triggers in a workflow
 */
export function getWorkflowNextExecutionTime(
  triggers: WorkflowTrigger[],
  history: WorkflowExecutionHistoryModel[]
): Date | null {
  const scheduledTriggers = triggers.filter((trigger) => trigger.type === 'scheduled');

  if (scheduledTriggers.length === 0) {
    return null;
  }

  const lastRun = history[0]?.finishedAt ? new Date(history[0]?.finishedAt) : null;

  // Calculate next execution times for all scheduled triggers
  const nextExecutionTimes = scheduledTriggers
    .map((trigger) => calculateNextExecutionTime(trigger, lastRun))
    .filter((time): time is Date => time !== null);

  if (nextExecutionTimes.length === 0) {
    return null;
  }

  // Return the earliest next execution time
  return new Date(Math.min(...nextExecutionTimes.map((time) => time.getTime())));
}
