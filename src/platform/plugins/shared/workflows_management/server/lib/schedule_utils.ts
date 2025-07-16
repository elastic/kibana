/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsWorkflowTrigger } from '@kbn/workflows';

/**
 * Converts a workflow scheduled trigger to a task manager schedule format
 */
export function convertWorkflowScheduleToTaskSchedule(trigger: EsWorkflowTrigger) {
  if (trigger.type !== 'schedule') {
    throw new Error(`Expected trigger type 'schedule', got '${trigger.type}'`);
  }

  const config = trigger.config || {};
  
  // Handle interval-based scheduling (e.g., every 5 minutes)
  if (config.every && config.unit) {
    const interval = `${config.every}${config.unit}`;
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
export function hasScheduledTriggers(triggers: EsWorkflowTrigger[]): boolean {
  return triggers.some(trigger => trigger.type === 'schedule' && trigger.enabled);
}

/**
 * Gets all scheduled triggers from a workflow
 */
export function getScheduledTriggers(triggers: EsWorkflowTrigger[]): EsWorkflowTrigger[] {
  return triggers.filter(trigger => trigger.type === 'schedule' && trigger.enabled);
} 