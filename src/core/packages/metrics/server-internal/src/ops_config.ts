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

/** @internal */
export interface OpsConfigEventLoopWatchdogProfiling {
  startAfter: Duration;
  maxDuration: Duration;
  cooldown: Duration;
}

/** @internal */
export interface OpsConfigEventLoopWatchdog {
  enabled: boolean;
  blockThreshold: Duration;
  profiling: OpsConfigEventLoopWatchdogProfiling;
  startup: {
    blockThreshold?: Duration;
    profiling: Partial<OpsConfigEventLoopWatchdogProfiling>;
  };
  statsInterval: Duration;
}

/** @internal */
export interface OpsConfigType {
  interval: Duration;
  cGroupOverrides: OpsConfigCGroupOverridesOps;
  eventLoopWatchdog: OpsConfigEventLoopWatchdog;
}

const blockThresholdBounds = { min: '200ms', max: '60s' } as const;
// Low enough for a profile to finish before a liveness probe restarts a blocked Kibana.
const startAfterBounds = { min: '2s', max: '4m' } as const;
// A longer capture makes a larger profile, which the worker holds in memory.
const maxDurationBounds = { min: '1s', max: '10s' } as const;
const cooldownBounds = { min: '10s', max: '24h' } as const;

const configSchema = schema.object({
  interval: schema.duration({ defaultValue: OPS_METRICS_INTERVAL }),
  cGroupOverrides: schema.object({
    cpuPath: schema.maybe(schema.string()),
    cpuAcctPath: schema.maybe(schema.string()),
  }),
  eventLoopWatchdog: schema.object({
    // Fallback value of the `core.eventLoopWatchdog.enabled` feature flag, read at startup.
    // It has no effect where a flag provider or a `feature_flags.overrides` entry sets the flag.
    enabled: schema.boolean({ defaultValue: false }),
    // Minimum block length to report, for blocks that start in the `running` phase.
    blockThreshold: schema.duration({ defaultValue: '200ms', ...blockThresholdBounds }),
    // CPU profiling settings for long blocks that begin after startup. A role-specific feature
    // flag enables profiling.
    profiling: schema.object({
      // Start a profile when a block reaches this duration, or the block threshold if that's
      // longer: a block is only detected once it reaches the block threshold.
      startAfter: schema.duration({ defaultValue: '30s', ...startAfterBounds }),
      // Maximum duration of one profile capture.
      maxDuration: schema.duration({ defaultValue: '10s', ...maxDurationBounds }),
      // Minimum wait after a capture before another can start.
      cooldown: schema.duration({ defaultValue: '1m', ...cooldownBounds }),
    }),
    startup: schema.object({
      // Same for blocks that start in the `starting` phase; falls back to `blockThreshold`.
      blockThreshold: schema.maybe(schema.duration(blockThresholdBounds)),
      // Profiling settings for startup blocks. Each unset value uses its setting above.
      profiling: schema.object({
        startAfter: schema.maybe(schema.duration(startAfterBounds)),
        maxDuration: schema.maybe(schema.duration(maxDurationBounds)),
        cooldown: schema.maybe(schema.duration(cooldownBounds)),
      }),
    }),
    statsInterval: schema.duration({ defaultValue: '10m', min: '1m', max: '24h' }),
  }),
});

export const opsConfig: ServiceConfigDescriptor<OpsConfigType> = {
  path: OPS_CONFIG_PATH,
  schema: configSchema,
};
