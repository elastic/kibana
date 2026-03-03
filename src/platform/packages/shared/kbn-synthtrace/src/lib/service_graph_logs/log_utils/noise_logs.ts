/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import type { InfraDependency, NoiseHealthState, ServiceNode } from '../types';
import { mulberry32 } from '../placeholders';
import { pickInfraMessage, pickNoiseMessage } from '../utils/templates';
import { getOrBuildMetadata } from '../utils/metadata';
import {
  buildLogDoc,
  resolveLogLevel,
  resolveLogLevelFromSeed,
  type ServiceGraphOptions,
  type ServicePhaseOptions,
} from './shared';
import { DEP_TO_CATEGORY, INFRA_FAIL_CONDITION } from '../constants';
import type { InfraCategory } from '../constants';

/** Probability a ghost-mention doc fires on any given tick when no explicit `rate` is configured. */
const DEFAULT_GHOST_MENTION_RATE = 0.05;

export interface NoiseDocsOptions extends ServiceGraphOptions {
  count: number;
  /** When true, noise docs reflect a degraded state (warn/error instead of info). */
  degraded?: boolean;
  ghostMentions?: Array<{ message: string; serviceName?: string; rate?: number }>;
}

export interface NoiseLogOptions extends ServicePhaseOptions {
  rng: () => number;
  /** When true, this doc may be emitted at degraded health state. */
  degraded?: boolean;
}

export interface InfraNoiseLogOptions extends ServicePhaseOptions {
  dep: InfraDependency;
  /** When true, this dep is in a degraded state and may emit warn or error level logs. */
  degraded?: boolean;
}

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

  const resolvedLevel = resolveLogLevel(degraded, rng);
  const level = resolvedLevel === 'error' ? 'warn' : resolvedLevel;

  const healthState: NoiseHealthState = level === 'info' ? 'healthy' : 'degraded';
  const message = pickNoiseMessage({
    seed,
    runtime: service.runtime,
    serviceName: service.name,
    infraDep,
    healthState,
  });

  return buildLogDoc({ service, level, message, metadata });
}

export function generateInfraNoiseLog({
  dep,
  seed,
  degraded = false,
  timestamp,
  service,
  cachedMetadata,
}: InfraNoiseLogOptions): Partial<LogDocument> | null {
  const category = DEP_TO_CATEGORY[dep];
  if (!category) return null;

  // Use an offset seed so the level roll is independent from the message-pick seed.
  const level = resolveLogLevelFromSeed(degraded, seed);
  const condition =
    level === 'info'
      ? 'healthy'
      : INFRA_FAIL_CONDITION[category as Exclude<InfraCategory, 'kubernetes'>];

  const message = pickInfraMessage({
    category,
    condition,
    level,
    seed,
    tech: dep,
    timestamp,
    serviceName: dep,
  });

  const metadata = cachedMetadata ?? getOrBuildMetadata(service, seed);
  return buildLogDoc({ service, level, message, metadata });
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
          cachedMetadata: getOrBuildMetadata(emitter.node, seed + i, metadataCache),
        })
      );
    } else {
      const doc = generateInfraNoiseLog({
        dep: emitter.dep,
        seed: seed + i,
        degraded,
        timestamp,
        service: emitter.service,
        cachedMetadata: getOrBuildMetadata(emitter.service, seed + i, metadataCache),
      });

      if (doc) {
        docs.push(doc);
      }
    }
  }

  for (const ghost of ghostMentions ?? []) {
    if (rng() >= (ghost.rate ?? DEFAULT_GHOST_MENTION_RATE) || serviceGraph.services.length === 0) {
      continue;
    }
    const svc =
      serviceGraph.services.find((s) => s.name === ghost.serviceName) ??
      serviceGraph.services[Math.floor(rng() * serviceGraph.services.length)];
    docs.push(
      buildLogDoc({
        service: svc,
        level: 'info',
        message: ghost.message,
        metadata: getOrBuildMetadata(svc, seed, metadataCache),
      })
    );
  }

  return docs;
}
