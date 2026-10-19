/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * RESEARCH ONLY (Track 2 islands) — main side. Enabled only with
 * KBN_RESEARCH_ISLAND=<pluginId,...> (KBN_RESEARCH_ISLAND_TRANSPORT=thread|process).
 * Island members are never loaded on main; PluginWrapper delegates their lifecycle here.
 */

import { execFileSync, fork } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MessageChannel, Worker } from 'worker_threads';
import { isKibanaDistributable } from '@kbn/repo-info';
import type { Msg, Transport } from './wire';
import { RpcEndpoint } from './wire';
import { createProcessMainTransport, createThreadMainTransport } from './transports';
import { applyMainStubs, stubUsage, wrapImportedFnWithStubs } from './type_derived_adapters';

type Root = Record<string, (...args: unknown[]) => Promise<unknown>>;

const ROOT_METHODS = [
  'ping',
  'init',
  'setup',
  'start',
  'snapshot',
  'stop',
  'stats',
  'gc',
  'resetStats',
  'setFencePhase',
];

/** Flattens moment durations so the ES client config crosses as plain data. */
const flattenConfig = (value: unknown, depth = 0): unknown => {
  if (depth > 8) return undefined;
  if (Array.isArray(value)) return value.map((v) => flattenConfig(v, depth + 1));
  if (value && typeof value === 'object') {
    const maybeDuration = value as { asMilliseconds?: () => number; _isAMomentObject?: boolean };
    if (typeof maybeDuration.asMilliseconds === 'function') {
      return { $duration: maybeDuration.asMilliseconds() };
    }
    if (Buffer.isBuffer(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val !== 'function') out[key] = flattenConfig(val, depth + 1);
    }
    return out;
  }
  return value;
};

export class IslandHost {
  private endpoint?: RpcEndpoint;
  private root?: Root;
  private ready?: Promise<void>;
  private worker?: Worker;
  private child?: import('child_process').ChildProcess;
  public readonly bootStartedAt = Date.now();
  public readyAt?: number;
  private readonly serverPaths = new Map<string, string>();
  private kibanaVersion = '0.0.0';

  constructor(
    public readonly members: ReadonlySet<string>,
    public readonly transportKind: 'thread' | 'process'
  ) {}

  public isMember(pluginName: string): boolean {
    return this.members.has(pluginName);
  }

  public getEndpoint(): RpcEndpoint | undefined {
    return this.endpoint;
  }

  private boot(): Promise<void> {
    if (this.ready) return this.ready;
    const entry = join(__dirname, 'island_entry.js');
    let transport: Transport;
    let readyResolve!: () => void;
    const readyPromise = new Promise<void>((resolve) => (readyResolve = resolve));
    if (this.transportKind === 'thread') {
      const flag = new SharedArrayBuffer(4);
      const { port1: syncReplyMain, port2: syncReplyIsland } = new MessageChannel();
      this.worker = new Worker(entry, {
        workerData: { flag, syncReplyPort: syncReplyIsland, dist: isKibanaDistributable() },
        transferList: [syncReplyIsland],
        env: process.env,
        argv: [],
        stdout: false,
        stderr: false,
      });
      this.worker.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error('[research-island] worker error', err);
      });
      this.worker.unref();
      transport = createThreadMainTransport(this.worker, new Int32Array(flag), syncReplyMain);
    } else {
      const dir = mkdtempSync(join(tmpdir(), 'kbn-island-'));
      const toMain = join(dir, 'to_main');
      const fromMain = join(dir, 'from_main');
      execFileSync('mkfifo', [toMain, fromMain]);
      this.child = fork(entry, [], {
        serialization: 'advanced',
        env: {
          ...process.env,
          KBN_RESEARCH_ISLAND_FIFO_TO_MAIN: toMain,
          KBN_RESEARCH_ISLAND_FIFO_FROM_MAIN: fromMain,
          KBN_RESEARCH_ISLAND_DIST: String(isKibanaDistributable()),
        },
        execArgv: process.execArgv.filter((a) => !a.startsWith('--inspect')),
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      });
      this.child.unref();
      transport = createProcessMainTransport(this.child, toMain, fromMain);
    }
    const endpoint = new RpcEndpoint('main', transport);
    endpoint.measureBytes = process.env.KBN_RESEARCH_ISLAND_BYTES === 'true';
    endpoint.wrapImportedFn = wrapImportedFnWithStubs;
    endpoint.onBreakage = (b) => {
      // eslint-disable-next-line no-console
      console.warn(`[research-island] breakage ${b.kind} ${b.label}: ${b.detail}`);
    };
    endpoint.onControl = (msg: Msg) => {
      if (msg.t === 'ready') {
        this.readyAt = Date.now();
        readyResolve();
      }
    };
    this.endpoint = endpoint;
    this.root = endpoint.importRoot(ROOT_METHODS, 'island') as Root;
    this.ready = readyPromise;
    return readyPromise;
  }

  public async init(name: string, serverPath: string, initializerContext: object): Promise<void> {
    await this.boot();
    this.kibanaVersion =
      (initializerContext as { env?: { packageInfo?: { version?: string } } }).env?.packageInfo
        ?.version ?? this.kibanaVersion;
    this.serverPaths.set(name, serverPath);
    this.endpoint!.labelHints.set(initializerContext, `core(${name}).initializerContext`);
    await this.root!.init(name, serverPath, initializerContext);
  }

  public async setup(name: string, core: object, deps: Record<string, unknown>): Promise<unknown> {
    this.label(name, 'setup', core, deps);
    return this.root!.setup(name, core, deps);
  }

  public async start(name: string, core: object, deps: Record<string, unknown>): Promise<unknown> {
    this.label(name, 'start', core, deps);
    const extras: Record<string, unknown> = { kibanaVersion: this.kibanaVersion };
    if (process.env.KBN_RESEARCH_ISLAND_LOCAL_ES === 'true') {
      // Reach-in: Core does not expose the ES client config to plugins; createClient() returns
      // a ClusterClient whose (private) merged config is read and the probe client closed.
      const es = (core as { elasticsearch?: { createClient?: (type: string) => unknown } })
        .elasticsearch;
      const probe = es?.createClient?.('research-island-config') as
        | { config?: unknown; close?: () => Promise<void> }
        | undefined;
      extras.esConfig = flattenConfig(probe?.config);
      void probe?.close?.();
    }
    const contract = await this.root!.start(name, core, deps, extras);
    return applyMainStubs(
      name,
      this.serverPaths.get(name)!,
      contract,
      (members) => this.root!.snapshot(name, members),
      (value) => this.endpoint!.isRemote(value)
    );
  }

  public async stop(name: string): Promise<void> {
    await this.root?.stop(name);
  }

  public async stats(): Promise<unknown> {
    if (!this.root) return { enabled: false };
    const island = await this.root.stats();
    const mem = process.memoryUsage();
    return {
      enabled: true,
      transport: this.transportKind,
      members: [...this.members],
      boot_to_ready_ms: this.readyAt ? this.readyAt - this.bootStartedAt : null,
      main: {
        pid: process.pid,
        memory: { rss: mem.rss, heap_used: mem.heapUsed, heap_total: mem.heapTotal },
        tables: this.endpoint!.tableSizes(),
        edges: [...this.endpoint!.stats.values()],
        breakages: this.endpoint!.breakages,
        stubs: stubUsage,
      },
      island,
    };
  }

  public async resetStats(): Promise<void> {
    this.endpoint?.stats.clear();
    await this.root?.resetStats();
  }

  public async setFencePhase(phase: string): Promise<unknown> {
    return this.root?.setFencePhase(phase);
  }

  public async gc(): Promise<unknown> {
    return this.root?.gc();
  }

  private label(name: string, lifecycle: string, core: object, deps: Record<string, unknown>) {
    const hints = this.endpoint!.labelHints;
    hints.set(core, `core(${name}).${lifecycle}`);
    for (const [dep, contract] of Object.entries(deps)) {
      if (contract && (typeof contract === 'object' || typeof contract === 'function')) {
        if (!hints.has(contract as object)) hints.set(contract as object, `${dep}.${lifecycle}`);
      }
    }
  }
}

const GLOBAL_KEY = '__kbnResearchIslandHost';

/** Returns the process-wide island host when KBN_RESEARCH_ISLAND is set. */
/**
 * Research images (distributables built from this branch) run the workflows island by default so
 * a QAF experiment project needs no env overrides; KBN_RESEARCH_ISLAND='' disables it.
 */
const applyBuildDefaults = (): void => {
  if (!isKibanaDistributable() || process.env.KBN_RESEARCH_ISLAND !== undefined) return;
  process.env.KBN_RESEARCH_ISLAND = 'workflowsExtensions,workflowsExecutionEngine';
  process.env.KBN_RESEARCH_ISLAND_LOCAL_ES ??= 'true';
  process.env.KBN_RESEARCH_ISLAND_STEP_MODULE ??= 'true';
};

export const getIslandHost = (): IslandHost | undefined => {
  applyBuildDefaults();
  const members = process.env.KBN_RESEARCH_ISLAND;
  if (!members) return undefined;
  const g = globalThis as unknown as Record<string, IslandHost | undefined>;
  if (!g[GLOBAL_KEY]) {
    const kind = process.env.KBN_RESEARCH_ISLAND_TRANSPORT === 'process' ? 'process' : 'thread';
    g[GLOBAL_KEY] = new IslandHost(
      new Set(
        members
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      ),
      kind
    );
  }
  return g[GLOBAL_KEY];
};
