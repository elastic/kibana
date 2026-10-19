/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * RESEARCH ONLY (Track 2 islands) — island side. Loads the island's plugins unmodified and
 * runs their lifecycle with Core and dependency contracts that are remote handles to main.
 */

import { isMainThread, parentPort, workerData } from 'worker_threads';
import { getHeapStatistics } from 'v8';
import type { Transport } from './wire';
import { RpcEndpoint } from './wire';
import { createProcessIslandTransport, createThreadIslandTransport } from './transports';
import type { IslandStartExtras } from './island_overrides';
import {
  applyIslandOverrides,
  getFenceStats,
  resetFences,
  setFencePhase,
} from './island_overrides';

interface PluginInstance {
  setup(core: unknown, deps: unknown): unknown;
  start(core: unknown, deps: unknown): unknown;
  stop?(): unknown;
}

const bootAt = Date.now();

export const main = (): void => {
  let transport: Transport;
  let mode: 'thread' | 'process';
  if (!isMainThread && parentPort) {
    const { flag, syncReplyPort } = workerData as {
      flag: SharedArrayBuffer;
      syncReplyPort: import('worker_threads').MessagePort;
    };
    transport = createThreadIslandTransport(parentPort, new Int32Array(flag), syncReplyPort);
    mode = 'thread';
  } else {
    transport = createProcessIslandTransport(
      process.env.KBN_RESEARCH_ISLAND_FIFO_TO_MAIN!,
      process.env.KBN_RESEARCH_ISLAND_FIFO_FROM_MAIN!
    );
    mode = 'process';
  }
  const endpoint = new RpcEndpoint('island', transport);
  endpoint.measureBytes = process.env.KBN_RESEARCH_ISLAND_BYTES === 'true';
  const instances = new Map<string, PluginInstance>();
  const contracts = new Map<string, { setup?: unknown; start?: unknown }>();
  const timings: Record<string, number> = {};

  const root = {
    ping: () => ({ mode, pid: process.pid, uptimeMs: Date.now() - bootAt }),
    async init(name: string, serverPath: string, initializerContext: unknown) {
      const t0 = Date.now();
      const definition = await import(serverPath);
      const instance = (await definition.plugin(initializerContext)) as PluginInstance;
      instances.set(name, instance);
      timings[`${name}.init_ms`] = Date.now() - t0;
      return true;
    },
    async setup(name: string, core: unknown, deps: unknown) {
      const t0 = Date.now();
      const instance = instances.get(name)!;
      const contract = await instance.setup(applyIslandOverrides(name, 'setup', core), deps);
      contracts.set(name, { setup: contract });
      if (contract && typeof contract === 'object') {
        endpoint.labelHints.set(contract as object, `${name}.setup`);
      }
      timings[`${name}.setup_ms`] = Date.now() - t0;
      return contract;
    },
    async start(name: string, core: unknown, deps: unknown, extras?: IslandStartExtras) {
      const t0 = Date.now();
      const instance = instances.get(name)!;
      const contract = await instance.start(
        applyIslandOverrides(name, 'start', core, extras),
        deps
      );
      contracts.get(name)!.start = contract;
      if (contract && typeof contract === 'object') {
        endpoint.labelHints.set(contract as object, `${name}.start`);
      }
      timings[`${name}.start_ms`] = Date.now() - t0;
      return contract;
    },
    /** Snapshot of sync data members of a start contract (main-side replica). */
    snapshot(name: string, members: string[]) {
      const contract = contracts.get(name)?.start as Record<string, () => unknown> | undefined;
      const out: Record<string, unknown> = {};
      for (const member of members) out[member] = contract?.[member]?.();
      return out;
    },
    async stop(name: string) {
      await instances.get(name)?.stop?.();
    },
    stats() {
      const mem = process.memoryUsage();
      const heap = getHeapStatistics();
      return {
        mode,
        pid: process.pid,
        uptime_ms: Date.now() - bootAt,
        timings,
        memory: {
          rss: mem.rss,
          heap_used: heap.used_heap_size,
          heap_total: heap.total_heap_size,
          external: mem.external,
          array_buffers: mem.arrayBuffers,
        },
        tables: endpoint.tableSizes(),
        edges: [...endpoint.stats.values()],
        breakages: endpoint.breakages,
        fences: getFenceStats(),
      };
    },
    gc() {
      const g = (globalThis as { gc?: () => void }).gc;
      if (g) g();
      return Boolean(g);
    },
    resetStats() {
      endpoint.stats.clear();
      resetFences();
      return true;
    },
    setFencePhase(next: string) {
      setFencePhase(next);
      return true;
    },
  };
  endpoint.exposeRoot(root, 'island');
  transport.post({ t: 'ready', mode, pid: process.pid });
};
