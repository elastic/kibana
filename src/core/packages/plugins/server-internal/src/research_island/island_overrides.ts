/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * RESEARCH ONLY (Track 2 islands) — island-side overrides of proxied Core contracts and the
 * fence counters.
 *
 * KBN_RESEARCH_ISLAND_LOCAL_ES=true: the island gets its own Elasticsearch ClusterClient (same
 * config as main's, sent once at start) so ES request/response bytes stay in the island
 * instead of being pumped through main. Scoped clients for fake (API-key) requests work from the
 * request headers; real requests lose main's auth-header storage (documented breakage).
 */

import moment from 'moment';
import type { Logger } from '@kbn/logging';
import {
  AgentManager,
  ClusterClient,
  getRequestHandlerFactory,
} from '@kbn/core-elasticsearch-client-server-internal';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';

const fences: Record<string, number> = {};
let phase = 'boot';

export const setFencePhase = (next: string): void => {
  phase = next;
};

export const countFence = (key: string): void => {
  const k = `${phase}|${key}`;
  fences[k] = (fences[k] ?? 0) + 1;
};

export const getFenceStats = (): Record<string, number> => ({ ...fences });

export const resetFences = (): void => {
  for (const key of Object.keys(fences)) delete fences[key];
};

/** Classifies an ES request path into a coarse fence class. */
export const classifyEsPath = (method: string, path: string): string => {
  const write = method !== 'GET' && method !== 'HEAD';
  const p = path.split('?')[0];
  const segs = p.split('/').filter(Boolean);
  const target = segs[0] ?? '';
  let kind: string;
  if (target.startsWith('_')) kind = target; // _bulk, _mget, _search, _index_template, ...
  else {
    const op = segs.find((s) => s.startsWith('_')) ?? (write ? '(doc-write)' : '(doc-read)');
    const index = target.replace(/[-_]?\d{4}\.\d{2}\.\d{2}.*$/, '').replace(/-\d+$/, '');
    kind = `${index} ${op}`;
  }
  return `${write ? 'W' : 'R'} ${method} ${kind}`;
};

/** Minimal island-local logger: warn+ forwarded to main asynchronously, debug/trace dropped. */
const createIslandLogger = (remote: Logger | undefined, context: string): Logger => {
  const forward =
    (level: 'info' | 'warn' | 'error' | 'fatal') =>
    (message: unknown, meta?: unknown): void => {
      if (!remote) return;
      setImmediate(() => {
        try {
          (remote[level] as (m: unknown, meta?: unknown) => void)(
            typeof message === 'function' ? (message as () => string)() : message,
            meta
          );
        } catch {
          // ignore
        }
      });
    };
  const noop = () => undefined;
  const logger = {
    trace: noop,
    debug: noop,
    info: forward('info'),
    warn: forward('warn'),
    error: forward('error'),
    fatal: forward('fatal'),
    log: noop,
    isLevelEnabled: (level: string) => level !== 'debug' && level !== 'trace' && level !== 'all',
    get: (...ctx: string[]) => createIslandLogger(remote, [context, ...ctx].join('.')),
  };
  return logger as unknown as Logger;
};

/** Config arrives with moment durations flattened to `{ $duration: ms }`. */
const reviveConfig = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reviveConfig);
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.$duration === 'number') return moment.duration(rec.$duration);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rec)) out[key] = reviveConfig(val);
    return out;
  }
  return value;
};

let localClient: ClusterClient | undefined;

const instrument = (client: { diagnostic?: { on(ev: string, cb: Function): void } }) => {
  client.diagnostic?.on('request', (_err: unknown, event: unknown) => {
    const params = (
      event as { meta?: { request?: { params?: { method?: string; path?: string } } } }
    )?.meta?.request?.params;
    countFence(classifyEsPath(params?.method ?? '?', params?.path ?? '?'));
  });
};

const getLocalClient = (extras: IslandStartExtras, remoteLogger?: Logger): ClusterClient => {
  if (localClient) return localClient;
  const logger = createIslandLogger(remoteLogger, 'research-island.elasticsearch');
  localClient = new ClusterClient({
    config: reviveConfig(extras.esConfig) as ElasticsearchClientConfig,
    logger,
    type: 'research-island',
    agentFactoryProvider: new AgentManager(logger, { dnsCacheTtlInSeconds: 0 }),
    kibanaVersion: extras.kibanaVersion,
    onRequestHandlerFactory: getRequestHandlerFactory(false),
  });
  instrument(localClient.asInternalUser as unknown as Parameters<typeof instrument>[0]);
  const root = (localClient as unknown as { rootScopedClient?: unknown }).rootScopedClient;
  if (root) instrument(root as Parameters<typeof instrument>[0]);
  return localClient;
};

export interface IslandStartExtras {
  esConfig?: unknown;
  kibanaVersion: string;
}

const overridden = new WeakSet<object>();
let pendingExtras: IslandStartExtras | undefined;
const deferredSetups: object[] = [];

/** Replaces `elasticsearch` on a (remote) CoreStart with the island-local client. */
const overrideCoreStart = (coreStart: unknown, extras: IslandStartExtras): void => {
  if (!coreStart || typeof coreStart !== 'object' || overridden.has(coreStart)) return;
  overridden.add(coreStart);
  const remoteEs = (coreStart as { elasticsearch: Record<string, unknown> }).elasticsearch;
  const client = getLocalClient(extras);
  const elasticsearch = {
    client,
    getCapabilities: remoteEs.getCapabilities,
    get publicBaseUrl() {
      return remoteEs.publicBaseUrl;
    },
    get metrics() {
      return remoteEs.metrics;
    },
  };
  Object.defineProperty(coreStart, 'elasticsearch', {
    configurable: true,
    enumerable: true,
    value: elasticsearch,
  });
};

export const applyIslandOverrides = (
  _plugin: string,
  lifecycle: 'setup' | 'start',
  core: unknown,
  extras?: IslandStartExtras
): unknown => {
  if (!core || typeof core !== 'object') return core;
  if (lifecycle === 'setup') {
    // getStartServices() hands out main's CoreStart: apply the same override to it.
    const setup = core as { getStartServices: () => Promise<unknown[]> };
    const remote = setup.getStartServices;
    Object.defineProperty(setup, 'getStartServices', {
      configurable: true,
      enumerable: true,
      value: async () => {
        const result = await remote();
        if (pendingExtras?.esConfig) overrideCoreStart(result[0], pendingExtras);
        return result;
      },
    });
    deferredSetups.push(setup);
    return core;
  }
  if (!extras?.esConfig) return core;
  pendingExtras = extras;
  overrideCoreStart(core, extras);
  return core;
};
