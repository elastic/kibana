/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FailureMap, InfraDependency, ServiceFailure, ServiceGraph } from '../types';
import { ERROR_TYPE_STATUS } from '../types';

/**
 * Resolves a flat map of service-name → ServiceFailure from a FailureMap.
 *
 * When multiple infra deps in the failure map affect the same service, the dep
 * whose errorType maps to the highest HTTP status code wins (worst-failure-wins).
 * This makes multi-dep failure injection deterministic regardless of object key order.
 */
export function resolveServiceFailures(
  serviceGraph: ServiceGraph,
  failures: FailureMap
): Record<string, ServiceFailure> {
  const resolved: Record<string, ServiceFailure> = {};

  if (failures.services) {
    for (const [name, failure] of Object.entries(failures.services)) {
      if (failure !== undefined) {
        resolved[name] = failure;
      }
    }
  }

  if (failures.infra) {
    for (const [dep, failure] of Object.entries(failures.infra) as Array<
      [InfraDependency, ServiceFailure]
    >) {
      if (!failure) {
        continue;
      }

      for (const svc of serviceGraph.services) {
        if (!svc.infraDeps.includes(dep)) {
          continue;
        }
        const existing = resolved[svc.name];
        const isWorse =
          !existing || ERROR_TYPE_STATUS[failure.errorType] > ERROR_TYPE_STATUS[existing.errorType];

        if (isWorse) {
          resolved[svc.name] = { errorType: failure.errorType, rate: failure.rate, sourceDep: dep };
        }
      }
    }
  }

  return resolved;
}
