/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import type { ErrorType, InfraDependency, ServiceNode } from '../types';
import { mulberry32 } from '../placeholders';
import { pickInfraMessage } from '../utils/templates';
import {
  buildMessageOverrides,
  getOrBuildMetadata,
  isK8sService,
  resolveOsType,
  type MetadataCache,
} from '../utils/metadata';
import { buildLogDoc, resolveLogLevel, type ServicePhaseOptions } from './shared';
import {
  DEP_TO_CATEGORY,
  INFRA_FAIL_CONDITION,
  KUBELET_ERROR_SEED_OFFSET,
  LEVEL_RNG_SEED_OFFSET,
} from '../constants';
import type { InfraCategory } from '../constants';

interface InfraFailState {
  /** When true, this dep is actively failing this tick. */
  isFailing?: boolean;
  /** When set, emit error-tier condition unconditionally. */
  failingErrorType?: ErrorType;
}

export interface InfraDocOptions extends InfraFailState {
  service: ServiceNode;
  dep: InfraDependency;
  /** Caller must pass a resolved seed — use resolveEffectiveSeed before calling. */
  seed: number;
  timestamp?: number;
  metadataCache?: MetadataCache;
}

export interface InfraLogOptions extends ServicePhaseOptions, InfraFailState {
  infraDep: InfraDependency;
  rng: () => number;
}

export interface HostSystemLogOptions extends ServicePhaseOptions {
  /**
   * K8s-specific error type to emit for pod events when service is failing.
   * Only k8s_oom and k8s_crash_loop_back produce host-level pod events.
   */
  errorType?: 'k8s_oom' | 'k8s_crash_loop_back';
}

/** Fixed probability for host/k8s system resource events when service is not failing. */
const HOST_NORMAL_RESOURCE_PROB = 0.005;

/** Maps k8s InfraErrorType → kubernetes template condition key. */
const K8S_ERROR_CONDITION: Record<'k8s_oom' | 'k8s_crash_loop_back', 'oom' | 'crash_loop_back'> = {
  k8s_oom: 'oom',
  k8s_crash_loop_back: 'crash_loop_back',
};

/** Extracts known placeholder keys from ECS metadata fields shared by infra log templates. */

function resolveInfraCondition<C extends Exclude<InfraCategory, 'kubernetes'>>(
  failingErrorType: ErrorType | undefined,
  isFailing: boolean,
  category: C,
  rng: () => number
): { condition: (typeof INFRA_FAIL_CONDITION)[C] | 'healthy'; level: 'info' | 'warn' | 'error' } {
  const failCondition = INFRA_FAIL_CONDITION[category];
  if (failingErrorType != null) {
    return { condition: failCondition, level: 'error' };
  }
  const level = resolveLogLevel(isFailing, rng);
  if (!isFailing) {
    // Reserve error-level for actively failing deps; a healthy dep can degrade to warn at most.
    const cappedLevel = level === 'error' ? 'warn' : level;
    return { condition: cappedLevel === 'info' ? 'healthy' : failCondition, level: cappedLevel };
  }
  return { condition: failCondition, level: level === 'info' ? 'warn' : level };
}

export function generateInfraLog({
  service,
  infraDep,
  rng,
  seed,
  isFailing = false,
  cachedMetadata,
  timestamp,
  failingErrorType,
}: InfraLogOptions): Array<Partial<LogDocument>> {
  const category = DEP_TO_CATEGORY[infraDep];
  if (!category) return [];

  const { condition, level } = resolveInfraCondition(
    failingErrorType,
    isFailing,
    category as Exclude<InfraCategory, 'kubernetes'>,
    rng
  );

  const metadata = cachedMetadata ?? getOrBuildMetadata(service, seed);
  const messageOverrides = buildMessageOverrides(metadata);

  const message = pickInfraMessage({
    category,
    condition,
    level,
    seed,
    tech: infraDep,
    overrides: messageOverrides,
    timestamp,
    serviceName: service.name,
  });
  return [buildLogDoc({ service, level, message, metadata })];
}

export function generateInfraDoc({
  service,
  dep,
  seed,
  isFailing = false,
  timestamp,
  metadataCache,
  failingErrorType,
}: InfraDocOptions): Array<Partial<LogDocument>> {
  const rng = mulberry32(seed);
  const cachedMetadata = metadataCache
    ? getOrBuildMetadata(service, seed, metadataCache)
    : undefined;
  return generateInfraLog({
    service,
    infraDep: dep,
    rng,
    seed,
    isFailing,
    cachedMetadata,
    timestamp,
    failingErrorType,
  });
}

export function generateHostSystemLog({
  service,
  seed,
  cachedMetadata,
  timestamp,
  errorType,
}: HostSystemLogOptions): Array<Partial<LogDocument>> {
  const metadata = cachedMetadata ?? getOrBuildMetadata(service, seed);
  // Use an offset seed so host rolls are independent from infra dep rolls.
  const isAbnormal = mulberry32(seed + LEVEL_RNG_SEED_OFFSET)() < HOST_NORMAL_RESOURCE_PROB;

  if (isK8sService(metadata)) {
    const messageOverrides = buildMessageOverrides(metadata);

    if (errorType != null) {
      const condition = K8S_ERROR_CONDITION[errorType];
      const pickArgs = {
        category: 'kubernetes' as const,
        condition,
        tech: 'kubelet',
        overrides: messageOverrides,
        timestamp,
        serviceName: service.name,
      };
      // Emit the type-specific pre-warning followed by the actual kubelet error event.
      const warnMessage = pickInfraMessage({ ...pickArgs, seed, level: 'warn' });
      const errorMessage = pickInfraMessage({
        ...pickArgs,
        seed: seed + KUBELET_ERROR_SEED_OFFSET,
        level: 'error',
      });
      return [
        buildLogDoc({ service, level: 'warn', message: warnMessage, metadata }),
        buildLogDoc({ service, level: 'error', message: errorMessage, metadata }),
      ];
    }

    // No active error type — emit a healthy kubelet status event.
    const message = pickInfraMessage({
      category: 'kubernetes',
      condition: 'healthy',
      seed,
      tech: 'kubelet',
      overrides: messageOverrides,
      timestamp,
      serviceName: service.name,
    });
    return [buildLogDoc({ service, level: 'info', message, metadata })];
  }

  const level = isAbnormal ? 'warn' : 'info';
  const message = pickInfraMessage({
    category: 'host',
    condition: isAbnormal ? 'resource_pressure' : 'healthy',
    level,
    seed,
    tech: resolveOsType(metadata),
    timestamp,
    serviceName: service.name,
  });
  return [buildLogDoc({ service, level, message, metadata })];
}
