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
  GeneratorOptions,
  InfraDependency,
  NoiseHealthState,
  ServiceGraph,
  ServiceNode,
} from '../types';
import { mulberry32 } from '../placeholders';
import { pickInfraMessage, pickNoiseMessage } from '../utils/templates';
import { getOrBuildMetadata, type MetadataCache } from '../utils/metadata';
import { buildLogDoc, type ServicePhaseOptions } from './shared';
import { DEP_TO_CATEGORY, INFRA_WARN_CONDITIONS } from '../constants';

/** Probability a ghost-mention doc fires on any given tick when no explicit `rate` is configured. */
const DEFAULT_GHOST_MENTION_RATE = 0.05;

export interface NoiseDocsOptions extends GeneratorOptions {
  /** Caller must pass a resolved seed — use resolveEffectiveSeed before calling. */
  seed: number;
  serviceGraph: ServiceGraph;
  count: number;
  /** When true, ~50% of noise docs will be degraded health state (warn level). */
  degraded?: boolean;
  metadataCache?: MetadataCache;
  ghostMentions?: Array<{ message: string; serviceName?: string; rate?: number }>;
}

function resolveNoiseHealth(degraded: boolean, rng: () => number): NoiseHealthState {
  if (!degraded) return 'healthy';
  return rng() < 0.5 ? 'degraded' : 'healthy';
}

export interface NoiseLogOptions extends Omit<ServicePhaseOptions, 'timestamp'> {
  rng: () => number;
  /** When true, this doc may be emitted at degraded health state. */
  degraded?: boolean;
}

export function generateNoiseLog({
  service,
  rng,
  seed,
  degraded = false,
  cachedMetadata,
}: NoiseLogOptions): Partial<LogDocument> {
  const metadata = cachedMetadata ?? getOrBuildMetadata(service, seed);

  const infraDep =
    service.infraDeps.length > 0
      ? service.infraDeps[Math.floor(rng() * service.infraDeps.length)]
      : undefined;

  const healthState = resolveNoiseHealth(degraded, rng);
  const message = pickNoiseMessage({
    seed,
    runtime: service.runtime,
    serviceName: service.name,
    infraDep,
    healthState,
  });
  const level = healthState === 'degraded' ? 'warn' : 'info';

  return buildLogDoc({ service, level, message, metadata });
}

export interface InfraNoiseLogOptions {
  dep: InfraDependency;
  rng: () => number;
  seed: number;
  /** When true, this doc may be emitted at degraded health state. */
  degraded?: boolean;
  timestamp?: number;
  /** Service node that owns this dep; used to populate host/k8s/os metadata. */
  service?: ServiceNode;
  cachedMetadata?: Record<string, string | undefined>;
}

export function generateInfraNoiseLog({
  dep,
  rng,
  seed,
  degraded = false,
  timestamp,
  service,
  cachedMetadata,
}: InfraNoiseLogOptions): Partial<LogDocument> | null {
  const category = DEP_TO_CATEGORY[dep];
  if (!category) return null;

  const healthState = resolveNoiseHealth(degraded, rng);
  const condition =
    healthState === 'degraded'
      ? INFRA_WARN_CONDITIONS[category]?.[
          Math.floor(rng() * (INFRA_WARN_CONDITIONS[category]?.length ?? 1))
        ] ?? 'healthy'
      : 'healthy';

  const level = healthState === 'degraded' ? 'warn' : 'info';
  const message = pickInfraMessage({
    category,
    condition,
    seed,
    tech: dep,
    timestamp,
    serviceName: dep,
  });

  if (service) {
    const metadata = cachedMetadata ?? getOrBuildMetadata(service, seed);
    return buildLogDoc({ service, level, message, metadata });
  }

  return { 'log.level': level, message };
}

export function generateNoiseDocs({
  serviceGraph,
  count,
  seed,
  degraded = false,
  timestamp,
  metadataCache,
  ghostMentions,
}: NoiseDocsOptions): Array<Partial<LogDocument>> {
  const rng = mulberry32(seed);

  // Combined pool: service nodes + one entry per unique infra dep (first owning service wins).
  interface ServiceEmitter {
    kind: 'service';
    node: ServiceNode;
  }
  interface InfraEmitter {
    kind: 'infra';
    dep: InfraDependency;
    service: ServiceNode;
  }
  type Emitter = ServiceEmitter | InfraEmitter;

  const infraEmitters = new Map<InfraDependency, ServiceNode>();
  for (const node of serviceGraph.services) {
    for (const dep of node.infraDeps) {
      if (!infraEmitters.has(dep)) infraEmitters.set(dep, node);
    }
  }

  const pool: Emitter[] = [
    ...serviceGraph.services.map((node): ServiceEmitter => ({ kind: 'service', node })),
    ...[...infraEmitters.entries()].map(
      ([dep, service]): InfraEmitter => ({ kind: 'infra', dep, service })
    ),
  ];

  const docs: Array<Partial<LogDocument>> = [];
  for (let i = 0; i < count; i++) {
    const emitter = pool[Math.floor(rng() * pool.length)];
    if (emitter.kind === 'service') {
      docs.push(
        generateNoiseLog({
          service: emitter.node,
          rng,
          seed: seed + i,
          degraded,
          cachedMetadata: metadataCache
            ? getOrBuildMetadata(emitter.node, seed + i, metadataCache)
            : undefined,
        })
      );
    } else {
      const doc = generateInfraNoiseLog({
        dep: emitter.dep,
        rng,
        seed: seed + i,
        degraded,
        timestamp,
        service: emitter.service,
        cachedMetadata: metadataCache
          ? getOrBuildMetadata(emitter.service, seed + i, metadataCache)
          : undefined,
      });
      if (doc) docs.push(doc);
    }
  }

  for (const ghost of ghostMentions ?? []) {
    if (rng() >= (ghost.rate ?? DEFAULT_GHOST_MENTION_RATE) || serviceGraph.services.length === 0) {
      continue;
    }
    const svc =
      serviceGraph.services.find((s) => s.name === ghost.serviceName) ??
      serviceGraph.services[Math.floor(rng() * serviceGraph.services.length)];
    docs.push({
      'service.name': svc.displayName ?? svc.name,
      'log.level': 'info',
      message: ghost.message,
    });
  }

  return docs;
}
