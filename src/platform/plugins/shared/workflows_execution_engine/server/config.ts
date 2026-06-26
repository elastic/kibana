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
  collectQueueMetrics: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When enabled, stores queue delay metrics (scheduledAt, runAt, queueDelayMs, scheduleDelayMs) in workflow executions. ' +
        'Useful for observability but adds to document size. Disabled by default for performance.',
    },
  }),
  sqliteCache: schema.object({
    /**
     * false (default): hold all step IO in V8 memory for the whole run — no eviction,
     * no rehydration, released at workflow end. Baseline for heap-pressure profiling.
     *
     * true: evict step outputs from RAM after each flush; rehydrate on-demand from the
     * local SQLite cache; fall back to Elasticsearch only on a cold cache (cross-node
     * resume). node:sqlite is experimental on Node 24.14 — enable with caution.
     */
    enabled: schema.boolean({ defaultValue: false }),
    /**
     * When true, prepareForRead loads only the predecessor step outputs that the
     * upcoming step's template expressions statically reference (dataStepDependencies
     * on the compiled graph node), rather than all transitive predecessors.
     *
     * Requires sqliteCache.enabled=true to have any effect — in RAM-only mode
     * prepareForRead is a no-op regardless.
     *
     * Default false: safe rollout path. Enable after verifying that the compiled
     * graph carries correct dataStepDependencies for your workflow shapes. A
     * runtime canary in getStepOutput logs ERROR when a step accesses an output
     * that was not rehydrated, providing immediate visibility into any analysis gap.
     */
    selectiveRehydration: schema.boolean({ defaultValue: false }),
    /**
     * When true, IPC payloads between the main thread and the SQLite worker are
     * zstd-compressed (node:zlib zstdCompressSync / zstdDecompressSync, native on
     * Node 24+). The worker→main return path also switches to Uint8Array transfer
     * (zero-copy) instead of structured-clone strings, removing the double-copy that
     * caused the +37% GC regression in Run D.
     *
     * Requires sqliteCache.enabled=true. Default false for A/B profiling baseline.
     */
    compressIpc: schema.boolean({ defaultValue: false }),
    /**
     * When true, step outputs are stored in the SQLite cache as binary JSON (JSONB
     * via SQLite's jsonb() function) rather than plain text. This lays groundwork for
     * future json_extract()-based queries at the worker layer. For the current
     * full-document rehydration path it adds a jsonb()/json() transcode with no query
     * payoff — forward-looking infra only.
     *
     * Requires sqliteCache.enabled=true. Default false for A/B profiling baseline.
     */
    jsonbStorage: schema.boolean({ defaultValue: false }),
  }),
});

export type EventTriggersConfig = TypeOf<typeof EventTriggersConfigSchema>;
export type WorkflowsExecutionEngineConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<WorkflowsExecutionEngineConfig> = {
  schema: configSchema,
};
