/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Frequency, Weekday } from '@kbn/rrule';

// Define the trigger type based on the schema
export interface WorkflowTrigger {
  type: 'alert' | 'scheduled' | 'manual';
  with?: Record<string, any>;
  enabled?: boolean;
}

/**
 * Parses interval string in format like "5m", "2h", "1d", "30s"
 * @param intervalString - The interval string to parse (e.g., "5m", "2h", "1d")
 * @returns Object with value and unit, or null if invalid
 */
export function parseIntervalString(
  intervalString: string
): { value: number; unit: string } | null {
  const match = intervalString.match(/^(\d+)([smhd])$/);
  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (isNaN(value) || value < 1) {
    return null;
  }

  return { value, unit };
}

// RRule configuration interface for YAML
export interface WorkflowRRuleConfig {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  tzid: string;
  dtstart?: string;
  byhour?: number[];
  byminute?: number[];
  byweekday?: string[];
  bymonthday?: number[];
}

/**
 * Converts a workflow scheduled trigger to a task manager schedule format
 */
export function convertWorkflowScheduleToTaskSchedule(trigger: WorkflowTrigger) {
  if (trigger.type !== 'scheduled') {
    throw new Error(`Expected trigger type 'scheduled', got '${trigger.type}'`);
  }

  const config = trigger.with || {};

  // Handle RRule-based scheduling (new)
  if (config.rrule) {
    return convertRRuleToTaskSchedule(config.rrule);
  }

  // Handle interval-based scheduling format (e.g., every: "5m")
  if (config.every && typeof config.every === 'string') {
    const parsed = parseIntervalString(config.every);
    if (parsed) {
      const interval = `${parsed.value}${parsed.unit}`;
      return { interval };
    }
  }

  // Handle legacy interval-based scheduling (e.g., every 5 minutes)
  if (config.every && config.unit) {
    const every = parseInt(config.every, 10);
    const unit = String(config.unit).toLowerCase();

    if (isNaN(every) || every < 1) {
      throw new Error(
        `Invalid schedule configuration: "every" must be a positive integer, got "${config.every}"`
      );
    }

    if (!unit) {
      throw new Error(
        `Invalid schedule configuration: unsupported unit "${unit}". Supported units: s, m, h, d`
      );
    }

    const interval = `${every}${unit}`;
    return { interval };
  }

  throw new Error(
    'Invalid schedule configuration. Must have either "rrule" or "every" (e.g., "5m", "2h", "1d")'
  );
}

/**
 * Checks if a workflow has any scheduled triggers
 */
export function hasScheduledTriggers(triggers: WorkflowTrigger[]): boolean {
  return triggers.some((trigger) => trigger.type === 'scheduled' && trigger.enabled);
}

/**
 * Gets all scheduled triggers from a workflow
 */
export function getScheduledTriggers(triggers: WorkflowTrigger[]): WorkflowTrigger[] {
  return triggers.filter((trigger) => trigger.type === 'scheduled' && trigger.enabled);
}

/**
 * Converts RRule configuration from YAML to taskmanager format
 */
export function convertRRuleToTaskSchedule(rruleConfig: WorkflowRRuleConfig) {
  // Validate required fields
  if (!rruleConfig.freq || !rruleConfig.interval || !rruleConfig.tzid) {
    throw new Error('RRule configuration must include freq, interval, and tzid fields');
  }

  // Convert frequency string to enum
  const frequencyMap: Record<string, Frequency> = {
    DAILY: Frequency.DAILY,
    WEEKLY: Frequency.WEEKLY,
    MONTHLY: Frequency.MONTHLY,
  };

  const freq = frequencyMap[rruleConfig.freq];
  if (!freq) {
    throw new Error(`Invalid RRule frequency: "${rruleConfig.freq}"`);
  }

  // Validate interval
  if (rruleConfig.interval < 1) {
    throw new Error('Interval must be a positive integer');
  }

  // Build the RRule object
  const rrule: any = {
    freq,
    interval: rruleConfig.interval,
    tzid: rruleConfig.tzid,
  };

  // Add optional fields
  if (rruleConfig.dtstart) {
    // Validate dtstart is a valid date
    const date = new Date(rruleConfig.dtstart);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid RRule dtstart: "${rruleConfig.dtstart}"`);
    }
    rrule.dtstart = rruleConfig.dtstart;
  }

  if (rruleConfig.byhour && rruleConfig.byhour.length > 0) {
    // Validate hour values
    for (const hour of rruleConfig.byhour) {
      if (hour < 0 || hour > 23) {
        throw new Error(`Invalid RRule byhour: "${hour}"`);
      }
    }
    rrule.byhour = rruleConfig.byhour;
  }

  if (rruleConfig.byminute && rruleConfig.byminute.length > 0) {
    // Validate minute values
    for (const minute of rruleConfig.byminute) {
      if (minute < 0 || minute > 59) {
        throw new Error(`Invalid RRule byminute: "${minute}"`);
      }
    }
    rrule.byminute = rruleConfig.byminute;
  }

  if (rruleConfig.byweekday && rruleConfig.byweekday.length > 0) {
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

    const weekdays = rruleConfig.byweekday.map((day) => {
      const weekday = weekdayMap[day.toUpperCase()];
      if (!weekday) {
        throw new Error(`Invalid RRule byweekday: "${day}"`);
      }
      return weekday;
    });

    rrule.byweekday = weekdays;
  }

  if (rruleConfig.bymonthday && rruleConfig.bymonthday.length > 0) {
    // Validate month days
    for (const day of rruleConfig.bymonthday) {
      if (day < 1 || day > 31) {
        throw new Error(`Invalid RRule bymonthday: "${day}"`);
      }
    }
    rrule.bymonthday = rruleConfig.bymonthday;
  }

  // Validate frequency-specific requirements
  if (freq === Frequency.WEEKLY && !rrule.byweekday) {
    throw new Error('WEEKLY frequency requires at least one byweekday value');
  }

  if (freq === Frequency.MONTHLY && !rrule.bymonthday && !rrule.byweekday) {
    throw new Error('MONTHLY frequency requires either bymonthday or byweekday values');
  }

  return { rrule };
}
