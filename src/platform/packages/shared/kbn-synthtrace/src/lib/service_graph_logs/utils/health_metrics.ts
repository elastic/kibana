/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorType, ServiceStats } from '../types';

const TOTAL_MEMORY_BYTES = 8 * 1024 * 1024 * 1024; // 8GB

interface HealthBand {
  cpuMin: number;
  cpuMax: number;
  freeMemoryMinPct: number;
  freeMemoryMaxPct: number;
}

const HEALTHY: HealthBand = {
  cpuMin: 0.15,
  cpuMax: 0.35,
  freeMemoryMinPct: 0.7,
  freeMemoryMaxPct: 0.9,
};
const DEGRADED: HealthBand = {
  cpuMin: 0.5,
  cpuMax: 0.75,
  freeMemoryMinPct: 0.4,
  freeMemoryMaxPct: 0.6,
};
const FAILING: HealthBand = {
  cpuMin: 0.8,
  cpuMax: 0.95,
  freeMemoryMinPct: 0.1,
  freeMemoryMaxPct: 0.3,
};
const OOM: HealthBand = {
  cpuMin: 0.95,
  cpuMax: 0.99,
  freeMemoryMinPct: 0.01,
  freeMemoryMaxPct: 0.05,
};

export interface InfraMetricValues {
  cpu: number;
  freeMemory: number;
  totalMemory: number;
}

/**
 * Derives infrastructure metric values from service health state.
 * Uses a deterministic RNG draw to pick values within the band.
 */
export const deriveInfraMetrics = (
  stats: ServiceStats | undefined,
  errorType: ErrorType | undefined,
  rng: () => number
): InfraMetricValues => {
  const errorRate = stats && stats.requests > 0 ? stats.errors / stats.requests : 0;

  let band: HealthBand;
  if (errorType === 'k8s_oom') {
    band = OOM;
  } else if (errorType === 'k8s_crash_loop_backoff') {
    // CrashLoop: intermittent spikes
    band = rng() < 0.5 ? FAILING : HEALTHY;
  } else if (errorRate > 0.5) {
    band = FAILING;
  } else if (errorRate > 0.05) {
    band = DEGRADED;
  } else {
    band = HEALTHY;
  }

  const cpu = band.cpuMin + rng() * (band.cpuMax - band.cpuMin);
  const freeMemPct =
    band.freeMemoryMinPct + rng() * (band.freeMemoryMaxPct - band.freeMemoryMinPct);

  return {
    cpu,
    freeMemory: Math.round(freeMemPct * TOTAL_MEMORY_BYTES),
    totalMemory: TOTAL_MEMORY_BYTES,
  };
};
