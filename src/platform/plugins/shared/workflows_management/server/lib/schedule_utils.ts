/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Define the trigger type based on the schema
export interface WorkflowTrigger {
  type: 'alert' | 'scheduled' | 'manual';
  with?: Record<string, any>;
  enabled?: boolean;
}

/**
 * Converts a workflow scheduled trigger to a task manager schedule format
 */
export function convertWorkflowScheduleToTaskSchedule(trigger: WorkflowTrigger) {
  if (trigger.type !== 'scheduled') {
    throw new Error(`Expected trigger type 'scheduled', got '${trigger.type}'`);
  }

  const config = trigger.with || {};

  // Handle interval-based scheduling (e.g., every 5 minutes)
  if (config.every && config.unit) {
    // Map common units to Task Manager cadence abbreviations
    const unitMap: Record<string, string> = {
      minute: 'm',
      minutes: 'm',
      min: 'm',
      m: 'm',
      hour: 'h',
      hours: 'h',
      h: 'h',
      day: 'd',
      days: 'd',
      d: 'd',
      second: 's',
      seconds: 's',
      sec: 's',
      s: 's',
    };

    const every = parseInt(config.every, 10);
    const unit = String(config.unit).toLowerCase();

    if (isNaN(every) || every < 1) {
      throw new Error(
        `Invalid schedule configuration: "every" must be a positive integer, got "${config.every}"`
      );
    }

    const cadence = unitMap[unit];
    if (!cadence) {
      throw new Error(
        `Invalid schedule configuration: unsupported unit "${
          config.unit
        }". Supported units: ${Object.keys(unitMap).join(', ')}`
      );
    }

    const interval = `${every}${cadence}`;
    return { interval };
  }

  // Handle cron-based scheduling
  if (config.cron) {
    return { interval: config.cron };
  }

  throw new Error('Invalid schedule configuration. Must have either "every" and "unit" or "cron"');
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
