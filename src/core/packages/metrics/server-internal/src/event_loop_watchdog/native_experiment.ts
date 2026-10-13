/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import Path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { Logger } from '@kbn/logging';
import { loadNativeProfiler, type NativeTarget } from './native_profiler';
import { SAMPLING_INTERVAL_US } from './types';

const MODES = ['off', 'metadata', 'sample'] as const;
export type NativeExperimentMode = (typeof MODES)[number];

/** Finds only the binding built alongside this exact runtime, unless explicitly overridden. */
export const resolveNativeAddon = (): string | undefined => {
  if (process.env.KBN_EVENT_LOOP_NATIVE_ADDON) return process.env.KBN_EVENT_LOOP_NATIVE_ADDON;
  const path = Path.resolve(
    Path.dirname(process.execPath),
    '../lib/event_loop_watchdog/profiler.node'
  );
  return Fs.existsSync(path) ? path : undefined;
};

/** Selects a per-process startup control, with an explicit override for reproducible local runs. */
export const selectNativeMode = (): NativeExperimentMode => {
  const override = process.env.KBN_EVENT_LOOP_NATIVE_MODE;
  if (override !== undefined) {
    const mode = MODES.find((candidate) => candidate === override);
    if (!mode) throw new Error('KBN_EVENT_LOOP_NATIVE_MODE must be off, metadata, or sample');
    return mode;
  }
  return MODES[Math.floor(Math.random() * MODES.length)];
};

/** POC-only, identical telemetry in all modes; CPU includes all process threads, ELU is main-thread. */
export class NativeExperiment {
  public readonly mode = selectNativeMode();
  public readonly target?: NativeTarget;
  private startedAt = performance.now();
  private cpu = process.cpuUsage();
  private elu = performance.eventLoopUtilization();
  private timer?: NodeJS.Timeout;

  constructor(path: string, private readonly logger: Logger) {
    const before = process.memoryUsage();
    if (this.mode !== 'off') {
      this.target = { path, id: loadNativeProfiler(path).initialize(SAMPLING_INTERVAL_US) };
    }
    this.log('prepared', {
      prepareMs: performance.now() - this.startedAt,
      prepareRssDeltaBytes: process.memoryUsage().rss - before.rss,
      node: process.version,
      v8: process.versions.v8,
      arch: process.arch,
      pointerCompression: Boolean(
        (process.config.variables as Readonly<Record<string, string | number | boolean>>)
          .v8_enable_pointer_compression
      ),
    });
    this.timer = setInterval(() => this.log('window'), 30_000);
    this.timer.unref();
  }

  public log(phase: string, extra: Record<string, string | number | boolean> = {}): void {
    const now = performance.now();
    const windowMs = now - this.startedAt;
    const cpu = process.cpuUsage(this.cpu);
    const elu = performance.eventLoopUtilization(this.elu);
    const memory = process.memoryUsage();
    const measurements = {
      mode: this.mode,
      phase,
      windowMs,
      cpuMs: (cpu.user + cpu.system) / 1000,
      cpuOneCorePercent: windowMs > 0 ? (cpu.user + cpu.system) / (windowMs * 10) : 0,
      elu: elu.utilization,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      ...extra,
    };
    this.logger.info('Native watchdog experiment: ' + JSON.stringify(measurements), {
      tags: ['event-loop-watchdog-native'],
      kibana: { event_loop_watchdog: { native: measurements } },
    });
    this.startedAt = performance.now();
    this.cpu = process.cpuUsage();
    this.elu = performance.eventLoopUtilization();
  }

  public stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
