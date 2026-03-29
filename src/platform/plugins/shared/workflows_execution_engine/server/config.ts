/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { DEFAULT_MAX_STEP_SIZE } from './step/errors';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  eventDriven: schema.object({
    /**
     * When false, event-driven workflow execution is disabled: event-triggered runs
     * (triggeredBy not in manual/scheduled/alert) are skipped at execution time.
     */
    enabled: schema.boolean({ defaultValue: true }),
    /**
     * When false, trigger events are not logged to the trigger-events data stream.
     */
    logEvents: schema.boolean({ defaultValue: true }),
    /**
     * Maximum depth for event-triggered chains (any workflow in the chain).
     * Scheduling is skipped when depth exceeds this value.
     */
    maxChainDepth: schema.number({ defaultValue: 10, min: 1 }),
  }),
  /**
   * Maximum depth of nested workflow execution (workflow calling workflow via workflow.execute step).
   */
  maxWorkflowDepth: schema.number({ defaultValue: 10, min: 1 }),
  logging: schema.object({
    console: schema.boolean({ defaultValue: false }),
  }),
  http: schema.object({
    allowedHosts: schema.arrayOf(
      schema.oneOf([schema.string({ hostname: true }), schema.literal('*')]),
      {
        defaultValue: ['*'],
      }
    ),
  }),
  maxResponseSize: schema.byteSize({ defaultValue: DEFAULT_MAX_STEP_SIZE }),
  collectQueueMetrics: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When enabled, stores queue delay metrics (scheduledAt, runAt, queueDelayMs, scheduleDelayMs) in workflow executions. ' +
        'Useful for observability but adds to document size. Disabled by default for performance.',
    },
  }),
  /**
   * Detects workflow executions left non-terminal after Kibana/Task Manager interruption
   * and schedules `workflow:resume` using credentials from the original `workflow:run` task.
   */
  recovery: schema.object({
    /**
     * When true, a periodic Task Manager job scans for interrupted RUNNING executions and schedules `workflow:resume`.
     * Defaults to false so behavior is opt-in until operators validate in their environment.
     */
    enabled: schema.boolean({ defaultValue: false }),
    intervalMinutes: schema.number({ defaultValue: 5, min: 1, max: 1440 }),
    batchSize: schema.number({ defaultValue: 25, min: 1, max: 500 }),
    /**
     * Only consider executions whose `startedAt` is at least this old, to avoid racing with a brand-new run.
     */
    minExecutionAgeSeconds: schema.number({ defaultValue: 30, min: 0, max: 86400 }),
    /**
     * Maximum automatic `workflow:resume` scheduling attempts per execution before marking FAILED.
     */
    maxAutoResumeAttempts: schema.number({ defaultValue: 5, min: 1, max: 100 }),
  }),
});

export type WorkflowsExecutionEngineConfig = TypeOf<typeof configSchema>;

/** Mirrors schema defaults for tests and mocks */
export const DEFAULT_WORKFLOW_RECOVERY_CONFIG: WorkflowsExecutionEngineConfig['recovery'] = {
  enabled: false,
  intervalMinutes: 5,
  batchSize: 25,
  minExecutionAgeSeconds: 30,
  maxAutoResumeAttempts: 5,
};

export const config: PluginConfigDescriptor<WorkflowsExecutionEngineConfig> = {
  schema: configSchema,
};
