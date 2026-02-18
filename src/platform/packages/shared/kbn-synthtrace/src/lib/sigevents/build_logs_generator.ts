/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import type {
  ErrorType,
  FailureMap,
  InfraDependency,
  LogsManifest,
  ServiceErrorType,
  ServiceFailure,
  ServiceGraph,
  ServiceNamesOf,
  ServiceNode,
  ServiceDependenciesOf,
} from './types';
import { isInfraErrorType } from './types';
import { generateServiceDocs } from './log_utils/service_logs';
import { generateInfraDoc, generateHostSystemLog } from './log_utils/infra_logs';
import { generateNoiseDocs } from './log_utils/noise_logs';
import { buildLogDoc } from './log_utils/shared';
import { toLogEntries } from './utils/converter';
import { buildMetadataCache, getOrBuildMetadata, type MetadataCache } from './utils/metadata';
import { mulberry32 } from './placeholders';
import { resolveEffectiveSeed, serviceStableSeed } from './utils/seed';
import { pickHealthyMessage } from './utils/templates';

export type FailuresOrFn<TServiceName extends string = string, TDepName extends string = string> =
  | FailureMap<TServiceName, TDepName>
  | ((timestamp: number) => FailureMap<TServiceName, TDepName> | undefined);

/** A burst or silence window applied to a log channel. */
export interface ChannelSpike {
  /** Absolute timestamp (ms since epoch) at which this spike begins.
   * Omit (or leave undefined) for a permanent spike active across the full scenario. */
  start?: number;
  /** Duration in ms from `start`. Omit for open-ended. */
  end?: number;
  /** Volume factor: 0 = silence, 1 = normal, N = N× burst. */
  multiplier: number;
  /** Optional: scope this spike to specific service names only. */
  services?: string[];
}

/** Per-channel volume shaping: rate (base doc multiplier), cadence, and spike windows. */
export interface ChannelEntry {
  /**
   * Base doc weight per tick. Semantics vary by key type:
   *
   * - **Entry service key** — scales the DFS trace multiplier. Defaults to `1`.
   * - **Other service keys** — extra background docs per tick. Defaults to `1`.
   *   Set `rate: 0` to suppress background docs while still tracking the service in the volume map.
   * - **Infra dep keys** — number of infra docs emitted per tick. Defaults to `1`.
   *   Combine with `spikes` to burst during incidents: `{ spikes: [{ start, multiplier: 4 }] }`.
   *
   * @example
   * // Emit 1 extra background doc for policy-lookup on every 10th tick:
   * { 'policy-lookup': { every: 10 } }
   * // Emit 4 postgres infra docs/tick during a 5-minute incident:
   * { postgres: { spikes: [{ start: at(0), end: duration('5m'), multiplier: 4 }] } }
   */
  rate?: number;
  /** Emit only on every N-th tick. Defaults to 1 (every tick). */
  every?: number;
  /** Burst/silence windows. First matching spike wins. */
  spikes?: ChannelSpike[];
}

/** Per-service/dep volume shaping map. Only the keys you provide are affected. */
export type ChannelVolume<TName extends string> = Partial<Record<TName, ChannelEntry>>;

/** Volume shaping for the noise (background chatter) channel. */
export interface NoiseVolumeConfig {
  /** Base noise doc count per tick. Defaults to topology size (service count). */
  rate?: number | ((ts: number) => number);
  /** Emit only on every N-th tick. Defaults to 1. */
  every?: number;
  /** Burst/silence windows. First matching spike wins. */
  spikes?: ChannelSpike[];
  /** Fractional jitter ± applied to the resolved count. Defaults to 0.5. */
  jitter?: number;
}

/** Noise (background chatter) channel configuration: GC logs, health checks, connection pool. */
export interface NoiseConfig {
  /** Volume shaping. Defaults to topology-sized rate with 0.5 jitter. */
  volume?: NoiseVolumeConfig;
  /** Ghost-mention docs (references to technologies not in any service’s infraDeps). */
  ghostMentions?: Array<{
    message: string;
    rate?: number;
  }>;
}

/** Full configuration for {@link buildLogsGenerator}. */
export interface LogsGeneratorConfig<TServiceGraph extends ServiceGraph = ServiceGraph> {
  /** Tick window in ms. */
  tickIntervalMs: number;
  /** Service topology. */
  serviceGraph: TServiceGraph;
  /** Entry service for the DFS request trace. Defaults to the first service. */
  entryService?: ServiceNamesOf<TServiceGraph>;
  /** What is broken: per-service and per-infra-dep failure configs. */
  failures?: FailuresOrFn<ServiceNamesOf<TServiceGraph>, ServiceDependenciesOf<TServiceGraph>>;
  /** How many docs: per-service/dep volume shaping (rate, cadence, spike windows). */
  volume?: ChannelVolume<ServiceNamesOf<TServiceGraph> | ServiceDependenciesOf<TServiceGraph>>;
  /** Background chatter channel. Omit (or pass undefined) to disable noise. */
  noise?: NoiseConfig;
  /** RNG seed for deterministic output. */
  seed?: number;
  /** Spread docs within a tick across this many ms. */
  tickSpreadMs?: number;
}

/** Selects the {svc, dep} pair for infra logs (priority: failing deps, fallback: round-robin). */
function selectInfraPair(
  allDeps: Array<{ svc: ServiceNode; dep: InfraDependency }>,
  priorityPairs: Array<{ svc: ServiceNode; dep: InfraDependency }>,
  index: number
): { svc: ServiceNode; dep: InfraDependency } {
  return priorityPairs.length > 0
    ? priorityPairs[index % priorityPairs.length]
    : allDeps[index % allDeps.length];
}

/** Builds infra-access and host-system log docs for a {svc, dep} pair. */
function buildInfraDocs({
  svc,
  dep,
  isFailing,
  failingDeps,
  failingServiceErrors,
  depFailingErrorType,
  timestamp,
  metadataCache,
  effectiveSeed,
}: {
  svc: ServiceNode;
  dep: InfraDependency;
  isFailing: boolean;
  failingDeps: Set<string>;
  failingServiceErrors: Map<string, ErrorType>;
  depFailingErrorType: ServiceErrorType | undefined;
  timestamp: number;
  metadataCache: MetadataCache | undefined;
  effectiveSeed: number;
}): Array<Partial<LogDocument>> {
  const infraDocs = generateInfraDoc({
    service: svc,
    dep,
    isFailing: failingDeps.has(dep),
    failingErrorType: depFailingErrorType,
    timestamp,
    metadataCache,
    seed: effectiveSeed,
  });

  const cachedMeta = metadataCache?.get(svc.name);
  const serviceErrorType = failingServiceErrors.get(svc.name);
  const k8sErrorType =
    serviceErrorType === 'k8s_oom' || serviceErrorType === 'k8s_crash_loop_back'
      ? serviceErrorType
      : undefined;

  const hostDoc = generateHostSystemLog({
    service: svc,
    seed: effectiveSeed,
    cachedMetadata: cachedMeta,
    timestamp,
    errorType: k8sErrorType,
  });

  return hostDoc ? [...infraDocs, hostDoc] : [...infraDocs];
}

const resolveFailures = (
  failuresOrFn: FailuresOrFn | undefined,
  timestamp: number
): FailureMap | undefined =>
  typeof failuresOrFn === 'function' ? failuresOrFn(timestamp) : failuresOrFn;

/** Returns `true` when this tick should emit (cadence gate). */
const resolveChannelEvery = (every: number | undefined, index: number): boolean =>
  !every || every <= 1 || index % every === 0;

/** Returns the spike multiplier for the first matching spike, or 1 if none match.
 * Spikes with no `start` are permanent and always active.
 * Spikes with a `start` are compared against the absolute `timestamp`;
 * `end` is a duration in ms from `start`. */
function resolveSpikes(
  spikes: ChannelSpike[] | undefined,
  timestamp: number,
  serviceName?: string
): number {
  if (!spikes || spikes.length === 0) return 1;
  for (const spike of spikes) {
    if (spike.services && (!serviceName || !spike.services.includes(serviceName))) continue;
    if (spike.start === undefined) {
      // No start = permanent spike, active for the full scenario.
      return spike.multiplier;
    }
    if (
      timestamp >= spike.start &&
      (spike.end === undefined || timestamp < spike.start + spike.end)
    ) {
      return spike.multiplier;
    }
  }
  return 1;
}

interface GeneratorContext {
  serviceGraph: ServiceGraph;
  entryService: string;
  failures: FailuresOrFn | undefined;
  volume: ChannelVolume<string> | undefined;
  noise: NoiseConfig | undefined;
  seed: number | undefined;
  metadataCache: MetadataCache | undefined;
  allDeps: Array<{ svc: ServiceNode; dep: InfraDependency }>;
  tickSpreadMs: number;
}

interface GeneratorState {
  infraIndex: number;
}

interface TickState {
  currentFailures: FailureMap | undefined;
  failingDeps: Set<string>;
  failingServiceErrors: Map<string, ErrorType>;
}

function resolveTickState({
  ctx,
  timestamp,
}: {
  ctx: GeneratorContext;
  timestamp: number;
}): TickState {
  const currentFailures = resolveFailures(ctx.failures, timestamp);

  const failingDeps = new Set<string>(Object.keys(currentFailures?.infra ?? {}));
  const failingServiceErrors = new Map<string, ErrorType>(
    Object.entries(currentFailures?.services ?? {})
      .filter((entry): entry is [string, ServiceFailure] => entry[1] != null)
      .map(([name, f]) => [name, f.errorType])
  );

  return { currentFailures, failingDeps, failingServiceErrors };
}

function collectServiceDocs({
  ctx,
  genState,
  tickState,
  index,
  timestamp,
}: {
  ctx: GeneratorContext;
  genState: GeneratorState;
  tickState: TickState;
  index: number;
  timestamp: number;
}): Array<Partial<LogDocument>> {
  const { serviceGraph, entryService, volume, metadataCache, seed } = ctx;
  const { currentFailures } = tickState;

  const entryCfg = volume?.[entryService];
  if (!resolveChannelEvery(entryCfg?.every, index)) return [];

  const spikeMultiplier = resolveSpikes(entryCfg?.spikes, timestamp);
  if (spikeMultiplier === 0) return [];

  const baseRate = entryCfg?.rate ?? 1;
  const traceCount = Math.max(0, Math.round(baseRate * spikeMultiplier));

  const docs: Array<Partial<LogDocument>> = [];
  for (let m = 0; m < traceCount; m++) {
    docs.push(
      ...generateServiceDocs({
        serviceGraph,
        entryService,
        index: index * traceCount + m,
        failures: currentFailures,
        timestamp,
        metadataCache,
        seed,
      })
    );
  }
  return docs;
}

function collectVolumeSkewDocs({
  ctx,
  genState,
  tickState,
  index,
  timestamp,
}: {
  ctx: GeneratorContext;
  genState: GeneratorState;
  tickState: TickState;
  index: number;
  timestamp: number;
}): Array<Partial<LogDocument>> {
  const { serviceGraph, entryService, volume, metadataCache, seed } = ctx;
  if (!volume) return [];

  const docs: Array<Partial<LogDocument>> = [];

  for (const svc of serviceGraph.services) {
    // Skip the entry service — it is handled by collectServiceDocs.
    if (svc.name === entryService) continue;

    const svcCfg = volume[svc.name];
    if (!svcCfg) continue;

    if (!resolveChannelEvery(svcCfg.every, index)) continue;

    const spikeMultiplier = resolveSpikes(svcCfg.spikes, timestamp, svc.name);
    const effectiveWeight = (svcCfg.rate ?? 1) * spikeMultiplier;
    if (effectiveWeight <= 0) continue;

    const extraCount =
      effectiveWeight < 1
        ? (() => {
            const tickSeed = resolveEffectiveSeed(seed, index, timestamp);
            const rng = mulberry32(serviceStableSeed(tickSeed, svc.name));
            return rng() < effectiveWeight ? 1 : 0;
          })()
        : Math.round(effectiveWeight);

    for (let k = 0; k < extraCount; k++) {
      const svcSeed = serviceStableSeed(seed ?? 0, svc.name);
      const metadata = getOrBuildMetadata(svc, svcSeed, metadataCache);
      const tickSeed = resolveEffectiveSeed(seed, index, timestamp);
      const message = pickHealthyMessage({
        seed: svcSeed,
        tickSeed,
        runtime: svc.runtime,
        serviceName: svc.name,
        overrides: { status: '200' },
        infraDeps: svc.infraDeps,
        overridePool: svc.serviceLogs?.success,
      });
      docs.push(buildLogDoc({ service: svc, level: 'info', message, metadata }));
    }
  }
  return docs;
}

function collectInfraDocs({
  ctx,
  genState,
  tickState,
  index,
  timestamp,
}: {
  ctx: GeneratorContext;
  genState: GeneratorState;
  tickState: TickState;
  index: number;
  timestamp: number;
}): Array<Partial<LogDocument>> {
  const { volume, allDeps, metadataCache, seed } = ctx;
  const { failingDeps, failingServiceErrors, currentFailures } = tickState;
  if (allDeps.length === 0) return [];

  // Use the failing dep volume entry first, then fall back to no cadence gate.
  const firstFailingDep = [...failingDeps][0];
  const infraCfg = firstFailingDep ? volume?.[firstFailingDep] : undefined;
  if (!resolveChannelEvery(infraCfg?.every, index)) return [];

  const priorityPairs = allDeps.filter(({ svc, dep }) => {
    const svcErr = failingServiceErrors.get(svc.name);
    return failingDeps.has(dep) || (svcErr !== undefined && isInfraErrorType(svcErr));
  });
  const currentIndex = genState.infraIndex++;
  const { svc, dep } = selectInfraPair(allDeps, priorityPairs, currentIndex);

  const depCfg = volume?.[dep];
  const spikeMultiplier = resolveSpikes(depCfg?.spikes, timestamp, svc.name);
  const baseRate = depCfg?.rate ?? 1;
  const infraCount = Math.max(0, Math.round(baseRate * spikeMultiplier));
  if (infraCount === 0) return [];

  const rawDepErrorType = currentFailures?.infra?.[dep]?.errorType;
  const depFailingErrorType =
    failingDeps.has(dep) && rawDepErrorType != null && !isInfraErrorType(rawDepErrorType)
      ? (rawDepErrorType as ServiceErrorType)
      : undefined;

  const result: Array<Partial<LogDocument>> = [];
  for (let i = 0; i < infraCount; i++) {
    result.push(
      ...buildInfraDocs({
        svc,
        dep,
        isFailing: failingDeps.has(dep),
        failingDeps,
        failingServiceErrors,
        depFailingErrorType,
        timestamp,
        metadataCache,
        effectiveSeed: resolveEffectiveSeed(seed, genState.infraIndex + i, timestamp),
      })
    );
  }
  return result;
}

function collectNoiseDocs({
  ctx,
  genState,
  tickState,
  index,
  timestamp,
}: {
  ctx: GeneratorContext;
  genState: GeneratorState;
  tickState: TickState;
  index: number;
  timestamp: number;
}): Array<Partial<LogDocument>> {
  const { noise, serviceGraph, metadataCache, seed } = ctx;
  if (!noise) return [];
  const { volume } = noise;

  if (!resolveChannelEvery(volume?.every, index)) return [];

  const spikeMultiplier = resolveSpikes(volume?.spikes, timestamp);
  if (spikeMultiplier === 0) return [];

  const rawRate = volume?.rate;
  const baseRate =
    rawRate === undefined
      ? serviceGraph.services.length
      : typeof rawRate === 'function'
      ? rawRate(timestamp)
      : rawRate;

  const jitter = volume?.jitter ?? 0.5;
  const prng = mulberry32(resolveEffectiveSeed(seed, index, timestamp));
  const jitteredRate =
    jitter > 0
      ? baseRate * spikeMultiplier * (1 + (prng() * 2 - 1) * jitter)
      : baseRate * spikeMultiplier;
  const resolvedCount = Math.max(0, Math.round(jitteredRate));

  // Noise health is degraded when any infra dep is actively failing.
  const degraded = tickState.failingDeps.size > 0;

  return generateNoiseDocs({
    serviceGraph,
    count: resolvedCount,
    degraded,
    timestamp,
    metadataCache,
    seed: resolveEffectiveSeed(seed, index, timestamp),
    ghostMentions: noise.ghostMentions,
  });
}

function spreadDocs({
  docs,
  timestamp,
  tickSpreadMs,
  seed,
}: {
  docs: Array<Partial<LogDocument>>;
  timestamp: number;
  tickSpreadMs: number;
  seed?: number;
}): ReturnType<typeof toLogEntries> {
  if (!tickSpreadMs || docs.length <= 1) {
    return toLogEntries(docs, timestamp);
  }

  const rng = mulberry32(resolveEffectiveSeed(seed, docs.length, timestamp));
  const withOffsets = docs.map((doc) => ({
    doc,
    offset: Math.floor(rng() * tickSpreadMs),
  }));
  // Sort by offset so emitted entries remain time-ordered within the tick.
  withOffsets.sort((a, b) => a.offset - b.offset);
  return withOffsets.flatMap(({ doc, offset }) => toLogEntries([doc], timestamp + offset));
}

/** Builds a deterministic log tick generator and a ground-truth manifest. */
export function buildLogsGenerator<TServiceGraph extends ServiceGraph = ServiceGraph>(
  config: LogsGeneratorConfig<TServiceGraph>
): {
  generator: (timestamp: number, index: number) => ReturnType<typeof toLogEntries>;
  manifest: LogsManifest;
} {
  const { serviceGraph, failures, volume, noise, seed } = config;
  const entryService =
    config.entryService ?? (serviceGraph.services[0]?.name as ServiceNamesOf<TServiceGraph>);
  const tickSpreadMs = config.tickSpreadMs ?? config.tickIntervalMs;

  const ctx: GeneratorContext = {
    serviceGraph,
    entryService,
    failures,
    volume: volume as ChannelVolume<string> | undefined,
    noise,
    seed,
    metadataCache: buildMetadataCache(serviceGraph, seed),
    allDeps: serviceGraph.services.flatMap((svc) => svc.infraDeps.map((dep) => ({ svc, dep }))),
    tickSpreadMs,
  };

  const genState: GeneratorState = { infraIndex: 0 };
  // Live-mode dedup: runner may call every second; skip calls within the same interval window.
  let nextTickAt = -Infinity;

  const manifest: LogsManifest = {
    services: serviceGraph.services,
    edges: serviceGraph.edges,
    activeInfraDeps: [...new Set(serviceGraph.services.flatMap((svc) => svc.infraDeps))],
  };

  const generator = (timestamp: number, index: number) => {
    if (timestamp < nextTickAt) {
      return [];
    }
    nextTickAt = timestamp + config.tickIntervalMs;

    const tickState = resolveTickState({ ctx, timestamp });
    const docs = [
      ...collectServiceDocs({ ctx, genState, tickState, index, timestamp }),
      ...collectVolumeSkewDocs({ ctx, genState, tickState, index, timestamp }),
      ...collectInfraDocs({ ctx, genState, tickState, index, timestamp }),
      ...collectNoiseDocs({ ctx, genState, tickState, index, timestamp }),
    ];

    return spreadDocs({ docs, timestamp, tickSpreadMs, seed });
  };

  return { generator, manifest };
}
