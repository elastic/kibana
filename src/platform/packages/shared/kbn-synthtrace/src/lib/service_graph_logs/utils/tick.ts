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
  ChannelSpike,
  ChannelVolume,
  ErrorType,
  FailureMap,
  FailuresOrFn,
  InfraDependency,
  NoiseConfig,
  ServiceErrorType,
  ServiceFailure,
  ServiceGraph,
  ServiceNode,
} from '../types';
import { isInfraErrorType } from '../types';
import { generateServiceDocs } from '../log_utils/service_logs';
import { generateInfraDoc, generateHostSystemLog } from '../log_utils/infra_logs';
import { generateNoiseDocs } from '../log_utils/noise_logs';
import { buildLogDoc } from '../log_utils/shared';
import { toLogEntries } from './converter';
import type { MetadataCache } from './metadata';
import { getOrBuildMetadata } from './metadata';
import { mulberry32 } from '../placeholders';
import { resolveEffectiveSeed, serviceStableSeed } from './seed';
import { pickHealthyMessage } from './templates';

export interface GeneratorContext {
  serviceGraph: ServiceGraph;
  entryService: string;
  failures: FailuresOrFn | undefined;
  volume: ChannelVolume<string> | undefined;
  noise: NoiseConfig | undefined;
  seed: number | undefined;
  metadataCache: MetadataCache | undefined;
  allDeps: Array<{ svc: ServiceNode; dep: InfraDependency }>;
  tickSpreadMs: number;
  cycleMs?: number;
  cycleOriginMs?: number;
}

export interface GeneratorState {
  infraIndex: number;
}

export interface TickState {
  currentFailures: FailureMap | undefined;
  failingDeps: Set<string>;
  failingServiceErrors: Map<string, ErrorType>;
}

const resolveFailures = (
  failuresOrFn: FailuresOrFn | undefined,
  timestamp: number
): FailureMap | undefined =>
  typeof failuresOrFn === 'function' ? failuresOrFn(timestamp) : failuresOrFn;

const resolveChannelEvery = (every: number | undefined, index: number): boolean =>
  !every || every <= 1 || index % every === 0;

const cycleTimestamp = (ts: number, cycleMs: number, originMs: number): number => {
  if (ts < originMs) {
    return ts;
  }
  return originMs + ((ts - originMs) % cycleMs);
};

function resolveSpikes(
  spikes: ChannelSpike[] | undefined,
  timestamp: number,
  ctx: GeneratorContext,
  serviceName?: string
): number {
  if (!spikes || spikes.length === 0) return 1;
  const ts =
    ctx.cycleMs != null && ctx.cycleOriginMs != null
      ? cycleTimestamp(timestamp, ctx.cycleMs, ctx.cycleOriginMs)
      : timestamp;

  for (const spike of spikes) {
    if (spike.services && (!serviceName || !spike.services.includes(serviceName))) {
      continue;
    }

    const afterStart = spike.start === undefined || ts >= spike.start;
    const beforeEnd = spike.end === undefined || ts < spike.end;
    if (afterStart && beforeEnd) {
      return spike.scale;
    }
  }
  return 1;
}

function selectInfraPair(
  allDeps: Array<{ svc: ServiceNode; dep: InfraDependency }>,
  priorityPairs: Array<{ svc: ServiceNode; dep: InfraDependency }>,
  index: number
): { svc: ServiceNode; dep: InfraDependency } {
  return priorityPairs.length > 0
    ? priorityPairs[index % priorityPairs.length]
    : allDeps[index % allDeps.length];
}

function buildInfraDocs({
  svc,
  dep,
  failingDeps,
  failingServiceErrors,
  depFailingErrorType,
  timestamp,
  metadataCache,
  effectiveSeed,
}: {
  svc: ServiceNode;
  dep: InfraDependency;
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

  const hostDocs = generateHostSystemLog({
    service: svc,
    seed: effectiveSeed,
    cachedMetadata: cachedMeta,
    timestamp,
    errorType: k8sErrorType,
  });

  return [...infraDocs, ...hostDocs];
}

export function resolveTickState({
  ctx,
  timestamp,
}: {
  ctx: GeneratorContext;
  timestamp: number;
}): TickState {
  const currentFailures = resolveFailures(ctx.failures, timestamp);
  const failingDeps = new Set<string>(
    Object.entries(currentFailures?.infra ?? {})
      .filter(([, cfg]) => {
        if (!cfg) return false;
        const rate = (cfg as { rate?: number }).rate;
        return typeof rate !== 'number' || rate > 0;
      })
      .map(([depName]) => depName)
  );

  const failingServiceErrors = new Map<string, ErrorType>(
    Object.entries(currentFailures?.services ?? {})
      .filter((entry): entry is [string, ServiceFailure] => {
        const failure = entry[1] as ServiceFailure | null | undefined;
        if (!failure) return false;
        const rate = (failure as { rate?: number }).rate;
        return typeof rate !== 'number' || rate > 0;
      })
      .map(([name, f]) => [name, f.errorType])
  );
  return { currentFailures, failingDeps, failingServiceErrors };
}

export function collectServiceDocs({
  ctx,
  tickState,
  index,
  timestamp,
}: {
  ctx: GeneratorContext;
  tickState: TickState;
  index: number;
  timestamp: number;
}): Array<Partial<LogDocument>> {
  const { serviceGraph, entryService, volume, metadataCache, seed } = ctx;
  const { currentFailures } = tickState;

  const entryCfg = volume?.[entryService];
  if (!resolveChannelEvery(entryCfg?.every, index)) return [];

  const spikeMultiplier = resolveSpikes(entryCfg?.spikes, timestamp, ctx);
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
        seed: seed ?? 0,
      })
    );
  }
  return docs;
}

export function collectVolumeSkewDocs({
  ctx,
  index,
  timestamp,
}: {
  ctx: GeneratorContext;
  index: number;
  timestamp: number;
}): Array<Partial<LogDocument>> {
  const { serviceGraph, entryService, volume, metadataCache, seed } = ctx;
  if (!volume) return [];

  const docs: Array<Partial<LogDocument>> = [];

  for (const svc of serviceGraph.services) {
    if (svc.name === entryService) continue;

    const svcCfg = volume[svc.name];
    if (!svcCfg) continue;

    if (!resolveChannelEvery(svcCfg.every, index)) continue;

    const spikeMultiplier = resolveSpikes(svcCfg.spikes, timestamp, ctx, svc.name);
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

export function collectInfraDocs({
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
  if (allDeps.length === 0) {
    return [];
  }

  const priorityPairs = allDeps.filter(({ svc, dep }) => {
    const svcErr = failingServiceErrors.get(svc.name);
    return failingDeps.has(dep) || (svcErr !== undefined && isInfraErrorType(svcErr));
  });
  const currentIndex = genState.infraIndex;
  const { svc, dep } = selectInfraPair(allDeps, priorityPairs, currentIndex);

  const depCfg = volume?.[dep];
  if (!resolveChannelEvery(depCfg?.every, index)) {
    return [];
  }

  genState.infraIndex++;

  const spikeMultiplier = resolveSpikes(depCfg?.spikes, timestamp, ctx, svc.name);
  const baseRate = depCfg?.rate ?? 1;
  const infraCount = Math.max(0, Math.round(baseRate * spikeMultiplier));
  if (infraCount === 0) {
    return [];
  }

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

export function collectNoiseDocs({
  ctx,
  tickState,
  index,
  timestamp,
}: {
  ctx: GeneratorContext;
  tickState: TickState;
  index: number;
  timestamp: number;
}): Array<Partial<LogDocument>> {
  const { noise, serviceGraph, metadataCache, seed } = ctx;
  if (!noise) return [];
  const { volume } = noise;

  if (!resolveChannelEvery(volume?.every, index)) return [];

  const spikeMultiplier = resolveSpikes(volume?.spikes, timestamp, ctx);
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

export function spreadDocs({
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
  withOffsets.sort((a, b) => a.offset - b.offset);
  return withOffsets.flatMap(({ doc, offset }) => toLogEntries([doc], timestamp + offset));
}
