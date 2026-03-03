/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogsGeneratorConfig, LogsManifest, ServiceGraph, ServiceNamesOf } from './types';
import { buildMetadataCache } from './utils/metadata';
import {
  type GeneratorContext,
  type GeneratorState,
  collectInfraDocs,
  collectNoiseDocs,
  collectServiceDocs,
  collectVolumeSkewDocs,
  resolveTickState,
  spreadDocs,
} from './utils/tick';

export type {
  FailuresOrFn,
  ChannelSpike,
  ChannelEntry,
  ChannelVolume,
  NoiseVolumeConfig,
  NoiseConfig,
  LogsGeneratorConfig,
} from './types';

/** Builds a deterministic log tick generator and a ground-truth manifest. */
export function buildLogsGenerator<TServiceGraph extends ServiceGraph = ServiceGraph>(
  config: LogsGeneratorConfig<TServiceGraph>
): {
  generator: (timestamp: number, index: number) => ReturnType<typeof spreadDocs>;
  manifest: LogsManifest;
} {
  const { serviceGraph, failures, volume, noise, seed, cycleMs, cycleOriginMs } = config;
  const entryService: ServiceNamesOf<TServiceGraph> =
    config.entryService ?? serviceGraph.services[0]?.name;

  const tickSpreadMs = config.tickSpreadMs ?? config.tickIntervalMs;

  const ctx: GeneratorContext = {
    serviceGraph,
    entryService,
    failures,
    volume,
    noise,
    seed,
    metadataCache: buildMetadataCache(serviceGraph, seed),
    allDeps: serviceGraph.services.flatMap((svc) => svc.infraDeps.map((dep) => ({ svc, dep }))),
    tickSpreadMs,
    cycleMs,
    cycleOriginMs,
  };

  const genState: GeneratorState = { infraIndex: 0 };
  let nextTickAt = -Infinity;

  const manifest: LogsManifest = {
    services: serviceGraph.services,
    edges: serviceGraph.edges,
    activeInfraDeps: [...new Set(serviceGraph.services.flatMap((svc) => svc.infraDeps))],
  };

  const generator = (timestamp: number, index: number) => {
    if (timestamp < nextTickAt) return [];
    nextTickAt = timestamp + config.tickIntervalMs;

    const tickState = resolveTickState({ ctx, timestamp });
    const docs = [
      ...collectServiceDocs({ ctx, tickState, index, timestamp }),
      ...collectVolumeSkewDocs({ ctx, index, timestamp }),
      ...collectInfraDocs({ ctx, genState, tickState, index, timestamp }),
      ...collectNoiseDocs({ ctx, tickState, index, timestamp }),
    ];

    return spreadDocs({ docs, timestamp, tickSpreadMs, seed });
  };

  return { generator, manifest };
}
