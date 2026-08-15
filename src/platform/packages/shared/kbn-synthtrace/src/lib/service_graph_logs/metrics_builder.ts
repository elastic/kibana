/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, InfraDocument, Instance } from '@kbn/synthtrace-client';
import type { infra } from '@kbn/synthtrace-client';
import type { ErrorType, ServiceGraph, ServiceNamesOf, ServiceStats } from './types';
import { deriveInfraMetrics } from './utils/health_metrics';
import { mulberry32 } from './placeholders';
import { deriveSeed, resolveEffectiveSeed } from './utils/seed';

type InfraHost = ReturnType<typeof infra.host>;
type InfraPod = ReturnType<typeof infra.pod>;

export interface InfraBuilder {
  host: InfraHost;
  pod?: InfraPod;
}

/**
 * Produces both APM app-level metrics and infra host/pod metrics in a single
 * pass over services, calling `deriveInfraMetrics` exactly once per service.
 */
export const buildHealthMetrics = <TServiceGraph extends ServiceGraph>({
  serviceGraph,
  serviceStats,
  failingServiceErrors,
  apmInstances,
  infraBuilders,
  timestamp,
  seed,
  index,
}: {
  serviceGraph: TServiceGraph;
  serviceStats: Record<string, ServiceStats>;
  failingServiceErrors: Map<string, ErrorType>;
  apmInstances: Map<ServiceNamesOf<TServiceGraph>, Instance>;
  infraBuilders: Map<ServiceNamesOf<TServiceGraph>, InfraBuilder>;
  timestamp: number;
  seed: number;
  index: number;
}): { apm: ApmFields[]; infra: InfraDocument[] } => {
  const apmResult: ApmFields[] = [];
  const infraResult: InfraDocument[] = [];
  const healthRng = mulberry32(
    deriveSeed(resolveEffectiveSeed(seed, index, timestamp), 'health_metrics')
  );

  for (const svc of serviceGraph.services) {
    const stats = serviceStats[svc.name];
    const svcErrorType = failingServiceErrors.get(svc.name);
    const { cpu, freeMemory, totalMemory } = deriveInfraMetrics(stats, svcErrorType, healthRng);

    const instance = apmInstances.get(svc.name);
    if (instance && stats && stats.requests > 0) {
      apmResult.push(
        ...instance
          .appMetrics({
            'system.cpu.total.norm.pct': cpu,
            'system.memory.actual.free': freeMemory,
            'system.memory.total': totalMemory,
          })
          .timestamp(timestamp)
          .serialize()
      );
    }

    const builder = infraBuilders.get(svc.name);
    if (builder) {
      infraResult.push(
        ...builder.host.cpu({ 'system.cpu.total.norm.pct': cpu }).timestamp(timestamp).serialize(),
        ...builder.host
          .memory({
            'system.memory.actual.free': freeMemory,
            'system.memory.total': totalMemory,
          })
          .timestamp(timestamp)
          .serialize()
      );
      if (builder.pod) {
        infraResult.push(...builder.pod.metrics().timestamp(timestamp).serialize());
      }
    }
  }

  return { apm: apmResult, infra: infraResult };
};
