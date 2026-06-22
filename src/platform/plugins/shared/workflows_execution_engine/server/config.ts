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

export const DEFAULT_EXECUTION_INDEX_ROLLOVER_TASK_INTERVAL = '5m'; // 1 day

export const DEFAULT_EXECUTION_INDEX_CLEANUP_TASK_INTERVAL = '10'; // 1 day

export const DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_AGE = '10'; // 7 days

export const DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_PRIMARY_SHARD_SIZE = '1gb'; // 10GB

export const DEFAULT_EXECUTION_INDEX_CLEANUP_MIN_INDEX_AGE = '20d'; // 7 days

const EventTriggersConfigSchema = schema.object({
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
});

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  eventDriven: EventTriggersConfigSchema,
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
  eviction: schema.object({
    /**
     * Minimum output payload size for a completed step to be eligible for eviction
     * from in-memory state after it has been flushed to Elasticsearch.
     * Payloads smaller than this threshold stay in memory to avoid ES round-trip latency.
     * Set to "0b" to evict all completed step outputs, or a very large value to disable eviction.
     */
    minPayloadSize: schema.byteSize({ defaultValue: '10kb' }),
  }),
  collectQueueMetrics: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When enabled, stores queue delay metrics (scheduledAt, runAt, queueDelayMs, scheduleDelayMs) in workflow executions. ' +
        'Useful for observability but adds to document size. Disabled by default for performance.',
    },
  }),
  executionIndexRolloverTaskInterval: schema.string({
    defaultValue: DEFAULT_EXECUTION_INDEX_ROLLOVER_TASK_INTERVAL,
    meta: {
      description:
        'Task Manager schedule interval for the workflow execution index rollover background task. ' +
        'Uses Elasticsearch duration format (e.g. "1d", "12h"). Changes take effect on next Kibana restart.',
    },
  }),
  executionIndexRolloverMaxAge: schema.string({
    defaultValue: DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_AGE,
    meta: {
      description:
        'Rollover the workflow execution write index when its age exceeds this value. ' +
        'Uses Elasticsearch duration format (e.g. "1m", "1d").',
    },
  }),
  executionIndexRolloverMaxPrimaryShardSize: schema.string({
    defaultValue: DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_PRIMARY_SHARD_SIZE,
    meta: {
      description:
        'Rollover the workflow execution write index when its primary shard size exceeds this value. ' +
        'Uses Elasticsearch byte size format (e.g. "1gb", "500mb").',
    },
  }),
  executionIndexCleanupTaskInterval: schema.string({
    defaultValue: DEFAULT_EXECUTION_INDEX_CLEANUP_TASK_INTERVAL,
    meta: {
      description:
        'Task Manager schedule interval for the workflow execution index cleanup background task. ' +
        'Uses Elasticsearch duration format (e.g. "1d", "12h"). Changes take effect on next Kibana restart.',
    },
  }),
  executionIndexCleanupMinIndexAge: schema.string({
    defaultValue: DEFAULT_EXECUTION_INDEX_CLEANUP_MIN_INDEX_AGE,
    meta: {
      description:
        'Minimum age of a non-write backing index before it is deleted. ' +
        'Uses Elasticsearch duration format (e.g. "30d", "1d"). Should be much greater than the maximum workflow timeout.',
    },
  }),
});

export type EventTriggersConfig = TypeOf<typeof EventTriggersConfigSchema>;
export type WorkflowsExecutionEngineConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<WorkflowsExecutionEngineConfig> = {
  schema: configSchema,
};
