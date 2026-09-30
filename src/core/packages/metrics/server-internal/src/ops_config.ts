/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { Duration } from 'moment';

/** @internal */
export const OPS_CONFIG_PATH = 'ops' as const;

/** @internal */
const OPS_METRICS_INTERVAL = '5s';

/** @internal */
interface OpsConfigCGroupOverridesOps {
  cpuPath?: string;
  cpuAcctPath?: string;
}

/**
 * Static, bounded settings of the event-loop watchdog. Enablement is controlled at runtime by the
 * `core.eventLoopWatchdog.enabled` feature flag, not by config.
 * @internal
 */
export interface EventLoopWatchdogConfigType {
  /** Minimum heartbeat staleness considered a block. */
  threshold: Duration;
  /** How often the main thread stamps its heartbeat. */
  heartbeatInterval: Duration;
  /** Minimum interval between live notices during one block. */
  liveNoticeInterval: Duration;
  /** Maximum live notices emitted for a single block. */
  maxLiveNoticesPerBlock: number;
  /** Maximum number of candidate activities listed in a report. */
  maxCandidates: number;
  /**
   * Only blocks lasting at least this long are CPU-profiled, since starting the profiler stalls
   * the main thread. Values below `threshold` behave like `threshold`.
   */
  profileAfter: Duration;
  /** Maximum duration of one CPU-profile capture. */
  maxProfileDuration: Duration;
  /** Minimum interval between two CPU-profile captures. */
  profileCooldown: Duration;
}

/** @internal */
export interface OpsConfigType {
  interval: Duration;
  cGroupOverrides: OpsConfigCGroupOverridesOps;
  eventLoopWatchdog: EventLoopWatchdogConfigType;
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

const boundedDuration = (defaultValue: string, minMs: number, maxMs: number) =>
  schema.duration({
    defaultValue,
    validate: (value) => {
      const ms = value.asMilliseconds();
      if (ms < minMs || ms > maxMs) {
        return `must be between ${minMs}ms and ${maxMs}ms`;
      }
    },
  });

const boundedInteger = (defaultValue: number, min: number, max: number) =>
  schema.number({
    defaultValue,
    min,
    max,
    validate: (value) => (Number.isInteger(value) ? undefined : 'must be an integer'),
  });

const configSchema = schema.object({
  interval: schema.duration({ defaultValue: OPS_METRICS_INTERVAL }),
  cGroupOverrides: schema.object({
    cpuPath: schema.maybe(schema.string()),
    cpuAcctPath: schema.maybe(schema.string()),
  }),
  eventLoopWatchdog: schema.object({
    threshold: boundedDuration('500ms', 50, MINUTE),
    heartbeatInterval: boundedDuration('100ms', 10, 10 * SECOND),
    liveNoticeInterval: boundedDuration('5s', 100, 5 * MINUTE),
    maxLiveNoticesPerBlock: boundedInteger(12, 1, 100),
    maxCandidates: boundedInteger(10, 1, 100),
    profileAfter: boundedDuration('500ms', 100, 5 * MINUTE),
    maxProfileDuration: boundedDuration('10s', 100, MINUTE),
    profileCooldown: boundedDuration('1m', 0, 60 * MINUTE),
  }),
});

export const opsConfig: ServiceConfigDescriptor<OpsConfigType> = {
  path: OPS_CONFIG_PATH,
  schema: configSchema,
};
