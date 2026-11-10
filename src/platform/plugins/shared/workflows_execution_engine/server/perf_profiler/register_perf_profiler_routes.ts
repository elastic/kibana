/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session } from 'node:inspector/promises';
import type { EventLoopUtilization, IntervalHistogram } from 'node:perf_hooks';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';

const NS_PER_MS = 1e6;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const histogramSummary = (histogram: IntervalHistogram) => ({
  min_ms: histogram.min / NS_PER_MS,
  mean_ms: histogram.mean / NS_PER_MS,
  p50_ms: histogram.percentile(50) / NS_PER_MS,
  p90_ms: histogram.percentile(90) / NS_PER_MS,
  p99_ms: histogram.percentile(99) / NS_PER_MS,
  max_ms: histogram.max / NS_PER_MS,
});

const captureSchema = schema.object({
  seconds: schema.number({ min: 1, max: 300, defaultValue: 60 }),
  interval_us: schema.number({ min: 100, max: 100_000, defaultValue: 1000 }),
  sampling_interval_bytes: schema.number({ min: 1024, max: 1_048_576, defaultValue: 32_768 }),
});

interface CaptureOptions {
  seconds: number;
  intervalUs: number;
  samplingInterval: number;
}

const captureProfiles = async (
  { seconds, intervalUs, samplingInterval }: CaptureOptions,
  logger: Logger
) => {
  const session = new Session();
  session.connect();
  const startedAt = new Date().toISOString();
  const eluStart = performance.eventLoopUtilization();
  try {
    await session.post('Profiler.enable');
    await session.post('Profiler.setSamplingInterval', { interval: intervalUs });
    await session.post('HeapProfiler.enable');
    await session.post('HeapProfiler.startSampling', { samplingInterval });
    await session.post('Profiler.start');
    logger.info(`perf profiler: capturing ${seconds}s`);
    await sleep(seconds * 1000);
    const { profile: cpuProfile } = await session.post('Profiler.stop');
    const { profile: heapProfile } = await session.post('HeapProfiler.stopSampling');
    return {
      pid: process.pid,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      seconds,
      event_loop_utilization: performance.eventLoopUtilization(eluStart).utilization,
      cpu_profile: cpuProfile,
      heap_profile: heapProfile,
    };
  } finally {
    session.disconnect();
  }
};

/** Registers internal superuser-only routes that profile this Kibana process (perf builds only). */
export const registerPerfProfilerRoutes = (
  router: IRouter,
  logger: Logger,
  serverUuid: string
): void => {
  const eventLoopDelay = monitorEventLoopDelay({ resolution: 10 });
  eventLoopDelay.enable();
  let lastElu: EventLoopUtilization = performance.eventLoopUtilization();
  let lastRuntimeAt = Date.now();
  let activeCapture: Promise<unknown> | undefined;

  const security = { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } };

  router.post(
    {
      path: '/internal/workflows_perf/profile',
      security,
      options: { access: 'internal', summary: 'Captures CPU and sampling heap profiles' },
      validate: { body: captureSchema },
    },
    async (_ctx, req, res) => {
      if (activeCapture) {
        return res.conflict({ body: { message: 'A profile capture is already running' } });
      }
      const {
        seconds,
        interval_us: intervalUs,
        sampling_interval_bytes: samplingInterval,
      } = req.body;
      const capture = captureProfiles({ seconds, intervalUs, samplingInterval }, logger);
      const release = () => {
        activeCapture = undefined;
      };
      activeCapture = capture.then(release, release);
      return res.ok({ body: { server_uuid: serverUuid, ...(await capture) } });
    }
  );

  router.get(
    {
      path: '/internal/workflows_perf/runtime',
      security,
      options: { access: 'internal', summary: 'Returns event loop and heap stats since last call' },
      validate: {},
    },
    async (_ctx, _req, res) => {
      const now = Date.now();
      const elu = performance.eventLoopUtilization(lastElu);
      const body = {
        server_uuid: serverUuid,
        pid: process.pid,
        window_ms: now - lastRuntimeAt,
        event_loop_utilization: elu.utilization,
        event_loop_delay: histogramSummary(eventLoopDelay),
        memory: process.memoryUsage(),
        heap: getHeapStatistics(),
        capture_in_progress: activeCapture !== undefined,
      };
      lastElu = performance.eventLoopUtilization();
      lastRuntimeAt = now;
      eventLoopDelay.reset();
      return res.ok({ body });
    }
  );
};
