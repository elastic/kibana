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
import moment, { type Duration } from 'moment';

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
  /** Maximum duration of one CPU-profile capture. */
  maxProfileDuration: Duration;
  /** Minimum interval between the starts of two CPU-profile captures. */
  profileCooldown: Duration;
  /** Maximum number of candidate activities listed in a report. */
  maxCandidates: number;
}

/** @internal */
export interface OpsConfigType {
  interval: Duration;
  cGroupOverrides: OpsConfigCGroupOverridesOps;
  eventLoopWatchdog: EventLoopWatchdogConfigType;
}

const boundedDuration = (defaultValue: string, min: string, max: string) =>
  schema.duration({
    defaultValue,
    validate: (value) => {
      const ms = value.asMilliseconds();
      const minMs = moment.duration(min).asMilliseconds();
      const maxMs = moment.duration(max).asMilliseconds();
      if (ms < minMs || ms > maxMs) {
        return `must be between ${min} and ${max}`;
      }
    },
  });

const configSchema = schema.object({
  interval: schema.duration({ defaultValue: OPS_METRICS_INTERVAL }),
  cGroupOverrides: schema.object({
    cpuPath: schema.maybe(schema.string()),
    cpuAcctPath: schema.maybe(schema.string()),
  }),
  eventLoopWatchdog: schema.object({
    threshold: boundedDuration('500ms', '50ms', '1m'),
    heartbeatInterval: boundedDuration('100ms', '10ms', '10s'),
    liveNoticeInterval: boundedDuration('5s', '100ms', '5m'),
    maxLiveNoticesPerBlock: schema.number({ defaultValue: 12, min: 1, max: 100 }),
    maxProfileDuration: boundedDuration('10s', '100ms', '1m'),
    profileCooldown: boundedDuration('1m', '0s', '1h'),
    maxCandidates: schema.number({ defaultValue: 10, min: 1, max: 100 }),
  }),
});

export const opsConfig: ServiceConfigDescriptor<OpsConfigType> = {
  path: OPS_CONFIG_PATH,
  schema: configSchema,
};
