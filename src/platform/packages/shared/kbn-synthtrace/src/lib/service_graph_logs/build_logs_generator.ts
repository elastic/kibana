/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, InfraDocument, Instance } from '@kbn/synthtrace-client';
import { apm, infra, Serializable } from '@kbn/synthtrace-client';
import type {
  LogsGeneratorConfig,
  LogsManifest,
  ServiceGraph,
  ServiceNamesOf,
  TickOutput,
} from './types';
import type { Runtime } from './constants';
import { buildMetadataCache } from './utils/metadata';
import {
  type GeneratorContext,
  collectInfraDocs,
  collectNoiseDocs,
  collectServiceResults,
  collectVolumeSkewDocs,
  resolveTickState,
  spreadDocs,
} from './utils/tick';
import { buildHealthMetrics, type InfraBuilder } from './metrics_builder';

export type {
  FailuresOrFn,
  ChannelSpike,
  ChannelEntry,
  ChannelVolume,
  NoiseVolumeConfig,
  NoiseConfig,
  LogsGeneratorConfig,
} from './types';

const RUNTIME_TO_AGENT: Record<Runtime, string> = {
  java: 'java',
  node: 'nodejs',
  python: 'python',
  go: 'go',
};

function validateAndNormalizeConfig<TServiceGraph extends ServiceGraph>(
  config: LogsGeneratorConfig<TServiceGraph>
): {
  entryService: ServiceNamesOf<TServiceGraph>;
  tickSpreadMs: number;
  effectiveSeed: number;
  traceSampleRate: number;
} {
  const { serviceGraph } = config;

  if (serviceGraph.services.length === 0) {
    throw new Error('buildLogsGenerator requires at least one service');
  }

  const entryService: ServiceNamesOf<TServiceGraph> =
    config.entryService ?? serviceGraph.services[0].name;

  if (!serviceGraph.services.some((svc) => svc.name === entryService)) {
    throw new Error(
      `Unknown entryService: "${entryService}". Valid services: ${serviceGraph.services
        .map((s) => s.name)
        .join(', ')}`
    );
  }

  return {
    entryService,
    tickSpreadMs: config.tickSpreadMs ?? config.tickIntervalMs,
    effectiveSeed: config.seed ?? Date.now(),
    traceSampleRate: config.traceSampleRate ?? 0.1,
  };
}

function buildInstances<TServiceGraph extends ServiceGraph>(
  serviceGraph: TServiceGraph
): {
  apmInstances: Map<ServiceNamesOf<TServiceGraph>, Instance>;
  infraBuilders: Map<ServiceNamesOf<TServiceGraph>, InfraBuilder>;
} {
  const apmInstances = new Map<ServiceNamesOf<TServiceGraph>, Instance>(
    serviceGraph.services.map((svc) => [
      svc.name,
      apm
        .service({
          name: svc.displayName ?? svc.name,
          environment: 'sigevents',
          agentName: RUNTIME_TO_AGENT[svc.runtime] ?? svc.runtime,
        })
        .instance(svc.displayName ?? svc.name),
    ])
  );

  const infraBuilders = new Map<ServiceNamesOf<TServiceGraph>, InfraBuilder>(
    serviceGraph.services.map((svc) => {
      const hostName = `${svc.name}-host`;
      const h = infra.host(hostName);
      const p = svc.deployment?.k8s ? infra.pod(`${svc.name}-pod`, hostName) : undefined;
      return [svc.name, { host: h, pod: p }];
    })
  );

  return { apmInstances, infraBuilders };
}

function computeTick({
  ctx,
  effectiveSeed,
  timestamp,
  index,
}: {
  ctx: GeneratorContext;
  effectiveSeed: number;
  timestamp: number;
  index: number;
}): TickOutput {
  const tickState = resolveTickState({ ctx, timestamp });
  const serviceResult = collectServiceResults({ ctx, tickState, index, timestamp });

  const logs = [
    ...serviceResult.docs,
    ...collectVolumeSkewDocs({ ctx, index, timestamp }),
    ...collectInfraDocs({ ctx, tickState, index, timestamp }),
    ...collectNoiseDocs({ ctx, tickState, index, timestamp }),
  ];

  const metrics = buildHealthMetrics({
    serviceGraph: ctx.serviceGraph,
    serviceStats: serviceResult.serviceStats,
    failingServiceErrors: tickState.failingServiceErrors,
    apmInstances: ctx.apmInstances,
    infraBuilders: ctx.infraBuilders,
    timestamp,
    seed: effectiveSeed,
    index,
  });

  return {
    logs,
    apm: [...serviceResult.apmEvents, ...metrics.apm],
    infra: metrics.infra,
  };
}

function createTickCache(
  ctx: GeneratorContext,
  effectiveSeed: number
): (timestamp: number, index: number) => TickOutput {
  const cache = new Map<string, TickOutput>();
  let lastComputedTimestamp = -Infinity;
  return (timestamp, index) => {
    const key = `${timestamp}:${index}`;
    const cached = cache.get(key);
    if (cached) return cached;

    if (timestamp < lastComputedTimestamp) {
      throw new Error(
        `generator() must be called with non-decreasing timestamps (got ${timestamp}, expected >= ${lastComputedTimestamp})`
      );
    }
    lastComputedTimestamp = timestamp;

    const result = computeTick({ ctx, effectiveSeed, timestamp, index });
    cache.set(key, result);
    return result;
  };
}

/** Builds deterministic signal generators and a ground-truth manifest. */
export function buildLogsGenerator<TServiceGraph extends ServiceGraph = ServiceGraph>(
  config: LogsGeneratorConfig<TServiceGraph>
): {
  logsGenerator: (timestamp: number, index: number) => ReturnType<typeof spreadDocs>;
  apmGenerator: (timestamp: number, index: number) => Array<Serializable<ApmFields>>;
  infraGenerator: (timestamp: number, index: number) => Array<Serializable<InfraDocument>>;
  manifest: LogsManifest;
} {
  const { serviceGraph, failures, volume, noise, cycleMs, cycleOriginMs } = config;
  const { entryService, tickSpreadMs, effectiveSeed, traceSampleRate } =
    validateAndNormalizeConfig(config);
  const { apmInstances, infraBuilders } = buildInstances(serviceGraph);

  const ctx: GeneratorContext<TServiceGraph> = {
    serviceGraph,
    entryService,
    failures,
    volume,
    noise,
    seed: effectiveSeed,
    metadataCache: buildMetadataCache(serviceGraph, effectiveSeed),
    allDeps: serviceGraph.services.flatMap((svc) => svc.infraDeps.map((dep) => ({ svc, dep }))),
    tickSpreadMs,
    cycleMs,
    cycleOriginMs,
    apmInstances,
    infraBuilders,
    traceSampleRate,
  };

  const getTickOutput = createTickCache(ctx, effectiveSeed);

  const manifest: LogsManifest = {
    services: serviceGraph.services,
    edges: serviceGraph.edges,
    activeInfraDeps: [...new Set(serviceGraph.services.flatMap((svc) => svc.infraDeps))],
  };

  const logsGenerator = (timestamp: number, index: number) => {
    const tick = getTickOutput(timestamp, index);
    return spreadDocs({ docs: tick.logs, timestamp, tickSpreadMs, seed: effectiveSeed });
  };

  const apmGenerator = (timestamp: number, index: number) => {
    const tick = getTickOutput(timestamp, index);
    return tick.apm.map((fields) => new Serializable(fields));
  };

  const infraGenerator = (timestamp: number, index: number) => {
    const tick = getTickOutput(timestamp, index);
    return tick.infra.map((fields) => new Serializable(fields));
  };

  return { logsGenerator, apmGenerator, infraGenerator, manifest };
}
