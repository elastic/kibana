/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const LABEL = 'ci:collect-ftr-timing';

export const ftrTimingEnabled = (process.env.GITHUB_PR_LABELS ?? '').split(',').includes(LABEL);

// Timing wrappers must be transparent during test definition (e.g. setupMocha/loadTests)
// because callsites()-based file detection in test helpers like APM's registry.ts uses
// callsites()[1] to identify the caller. An active wrapper function would shift that
// frame and cause incorrect file attribution. Call activateTiming() only after all
// test files are loaded (i.e. just before runTests).
let timingActive = false;
export const activateTiming = () => {
  timingActive = true;
};

interface TimingEntry {
  calls: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

export class FtrTimingRegistry {
  private readonly entries = new Map<string, TimingEntry>();

  record(name: string, durationMs: number) {
    const entry = this.entries.get(name);
    if (entry) {
      entry.calls++;
      entry.totalMs += durationMs;
      if (durationMs < entry.minMs) entry.minMs = durationMs;
      if (durationMs > entry.maxMs) entry.maxMs = durationMs;
    } else {
      this.entries.set(name, {
        calls: 1,
        totalMs: durationMs,
        minMs: durationMs,
        maxMs: durationMs,
      });
    }
  }

  writeToFile(filePath: string) {
    if (this.entries.size === 0) return;

    const rows = [...this.entries.entries()]
      .map(([name, s]) => ({
        name,
        calls: s.calls,
        totalMs: Math.round(s.totalMs),
        meanMs: Math.round(s.totalMs / s.calls),
        minMs: Math.round(s.minMs),
        maxMs: Math.round(s.maxMs),
      }))
      .sort((a, b) => b.totalMs - a.totalMs);

    mkdirSync(dirname(filePath), { recursive: true });
    appendFileSync(filePath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  }
}

export const ftrTimingRegistry = new FtrTimingRegistry();

/**
 * Wraps every method on `instance` in a timing proxy that records each call's
 * wall-clock duration into `ftrTimingRegistry`. Skips `init` so that
 * `isAsyncInstance` detection continues to work on async providers.
 *
 * Only called when `ftrTimingEnabled` is true.
 */
export function createTimingProxy(
  name: string,
  instance: { [k: string | symbol]: any }
): typeof instance {
  return new Proxy(instance, {
    get(_, prop, receiver) {
      const value = Reflect.get(instance, prop, receiver);

      if (typeof value !== 'function' || prop === 'init' || typeof prop === 'symbol') {
        return value;
      }

      if (!timingActive) {
        return value;
      }

      const wrapper = function (...args: any[]) {
        const start = Date.now();
        const methodName = `${name}.${String(prop)}`;
        let returned: any;
        try {
          // Bind to instance (not the proxy) so that internal `this.foo` accesses
          // bypass the proxy and avoid wrapping things like axios instances.
          returned = value.apply(instance, args);
        } catch (err) {
          ftrTimingRegistry.record(methodName, Date.now() - start);
          throw err;
        }
        if (returned instanceof Promise) {
          return returned.finally(() => {
            ftrTimingRegistry.record(methodName, Date.now() - start);
          });
        }
        ftrTimingRegistry.record(methodName, Date.now() - start);
        return returned;
      };
      // Forward property access on the wrapper to the original function so that
      // sub-properties like `fn.skip` remain accessible.
      return new Proxy(wrapper, {
        get(_target, p) {
          return Reflect.get(value, p);
        },
      });
    },
  });
}
