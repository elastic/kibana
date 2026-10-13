/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import { createRequire } from 'node:module';
import type { CpuProfile } from './profile_summary';
import type { InspectorSession } from './worker';

interface NativeBinding {
  initialize(intervalUs: number, eager?: boolean): number;
  request(target: number, start: boolean): number;
  poll(request: number): string | undefined;
  cancel(target: number): void;
  abandon(request: number): void;
  dispose(target: number): void;
}

export interface NativeTarget {
  path: string;
  id: number;
}

export const loadNativeProfiler = (path: string): NativeBinding => {
  const build = JSON.parse(Fs.readFileSync(path + '.json', 'utf8'));
  const variables = process.config.variables as typeof process.config.variables & {
    readonly v8_enable_pointer_compression: number;
    readonly v8_enable_sandbox: number;
  };
  if (
    build.node !== process.version ||
    build.modules !== process.versions.modules ||
    build.v8 !== process.versions.v8 ||
    build.platform !== process.platform ||
    build.arch !== process.arch ||
    build.pointerCompression !== Boolean(variables.v8_enable_pointer_compression) ||
    build.sandbox !== Boolean(variables.v8_enable_sandbox)
  ) {
    throw new Error('Native watchdog addon does not match this exact Node build');
  }
  const runtimeVariables = process.config.variables as Readonly<
    Record<string, string | number | boolean>
  >;
  for (const [name, value] of Object.entries(build.abiVariables ?? {})) {
    if (runtimeVariables[name] !== value) {
      throw new Error('Native watchdog addon ABI flag mismatch: ' + name);
    }
  }
  const binding = createRequire(__filename)(path) as NativeBinding;
  if (typeof binding.abandon !== 'function') {
    throw new Error('Native watchdog addon lacks request abandonment; rebuild it');
  }
  return binding;
};

/** Adapts native interrupt requests to the existing watchdog capture orchestration. */
export const createNativeSession = ({ path, id }: NativeTarget): InspectorSession => {
  const binding = loadNativeProfiler(path);
  const pending = new Map<
    NodeJS.Timeout,
    { request: number; callback: (error: Error | null, result?: object) => void }
  >();
  let disconnected = false;
  return {
    connectToMainThread: () => {},
    post: (method, _params, callback) => {
      if (disconnected) {
        callback(new Error('Native capture session disconnected'));
        return;
      }
      if (method === 'Profiler.enable' || method === 'Profiler.setSamplingInterval') {
        callback(null, {});
        return;
      }
      if (method !== 'Profiler.start' && method !== 'Profiler.stop') {
        callback(new Error('Unsupported native capture method: ' + method));
        return;
      }
      try {
        const request = binding.request(id, method === 'Profiler.start');
        const timer = setInterval(() => {
          try {
            const json = binding.poll(request);
            if (json === undefined) return;
            clearInterval(timer);
            pending.delete(timer);
            callback(null, json ? { profile: JSON.parse(json) as CpuProfile } : {});
          } catch (error) {
            clearInterval(timer);
            pending.delete(timer);
            callback(error);
          }
        }, 5);
        pending.set(timer, { request, callback });
      } catch (error) {
        callback(error);
      }
    },
    disconnect: () => {
      disconnected = true;
      for (const [timer, { request, callback }] of pending) {
        clearInterval(timer);
        binding.abandon(request);
        callback(new Error('Native capture session disconnected'));
      }
      pending.clear();
    },
  };
};
