/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import type { FailureMap, InfraDependency, ServiceFailure, ServiceGraph } from '../types';
import { ERROR_TYPE_STATUS } from '../types';
import { mulberry32 } from '../placeholders';
import { resolveEffectiveSeed } from '../utils/seed';
import { type ServiceGraphOptions } from './shared';
import { simulateRequest } from './simulate_request';

function resolveServiceFailures(
  serviceGraph: ServiceGraph,
  failures: FailureMap
): Record<string, ServiceFailure> {
  const resolved: Record<string, ServiceFailure> = {};

  if (failures.services) {
    for (const [name, failure] of Object.entries(failures.services)) {
      if (failure !== undefined) resolved[name] = failure;
    }
  }

  if (failures.infra) {
    for (const [dep, failure] of Object.entries(failures.infra)) {
      if (!failure) continue;
      const infraDep = dep as InfraDependency;
      for (const svc of serviceGraph.services) {
        if (!svc.infraDeps.includes(infraDep)) {
          continue;
        }
        const existing = resolved[svc.name];
        // Don't let an infra cascade overwrite a failure that was explicitly set via failures.services.
        if (existing !== undefined && existing.sourceDep === undefined) {
          continue;
        }
        const isWorse =
          !existing || ERROR_TYPE_STATUS[failure.errorType] > ERROR_TYPE_STATUS[existing.errorType];
        if (isWorse) {
          resolved[svc.name] = {
            errorType: failure.errorType,
            rate: failure.rate,
            sourceDep: infraDep,
          };
        }
      }
    }
  }

  return resolved;
}

export interface RequestDocsOptions extends ServiceGraphOptions {
  entryService: string;
  index?: number;
  failures?: FailureMap;
}

export function generateServiceDocs({
  serviceGraph,
  entryService,
  index,
  seed,
  failures,
  timestamp,
  metadataCache,
}: RequestDocsOptions): Array<Partial<LogDocument>> {
  const tickSeed = resolveEffectiveSeed(seed, index ?? 0, timestamp);
  const resolvedFailures = failures ? resolveServiceFailures(serviceGraph, failures) : undefined;
  const rng = mulberry32(tickSeed);
  return simulateRequest({
    serviceGraph,
    entryService,
    rng,
    resolvedFailures,
    stableSeed: seed,
    tickSeed,
    metadataCache,
  });
}
