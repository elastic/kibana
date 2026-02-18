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
  GeneratorOptions,
  InfraCategory,
  InfraDependency,
  ServiceNode,
} from '../types';
import { mulberry32 } from '../placeholders';
import { pickInfraMessage } from '../utils/templates';
import { getOrBuildMetadata, type MetadataCache } from '../utils/metadata';
import { buildLogDoc, type ServicePhaseOptions } from './shared';
import type { INFRA_LOG_TYPES } from '../constants';
import { DEP_TO_CATEGORY, INFRA_WARN_CONDITIONS, INFRA_ERROR_CONDITIONS } from '../constants';

export interface InfraDocOptions extends GeneratorOptions {
  service: ServiceNode;
  dep: InfraDependency;
  /** Caller must pass a resolved seed — use resolveEffectiveSeed before calling. */
  seed: number;
  metadataCache?: MetadataCache;
  /** When true, this dep is actively failing this tick. */
  isFailing?: boolean;
  /** When set, this dep is explicitly failing this tick — emit error-tier condition unconditionally. */
  failingErrorType?: ErrorType;
}

/** Fixed probabilities when a dep is NOT actively failing (replaces old baseline row). */
const NORMAL_PROBS = { error: 0, warn: 0.05 };
/** Fixed probabilities when a dep IS actively failing (replaces old incident row). */
const FAILING_PROBS = { error: 0.4, warn: 0.65 };

/** Fixed probability for host/k8s system resource events when service is not failing. */
const HOST_NORMAL_RESOURCE_PROB = 0.005;

/** Maps k8s InfraErrorType → kubernetes template condition key. */
const K8S_ERROR_CONDITION: Record<
  'k8s_oom' | 'k8s_crash_loop_back',
  (typeof INFRA_LOG_TYPES)['kubernetes'][number]
> = {
  k8s_oom: 'oom',
  k8s_crash_loop_back: 'crash_loop_back',
};

export interface InfraLogOptions extends Omit<ServicePhaseOptions, 'timestamp'> {
  infraDep: InfraDependency;
  rng: () => number;
  timestamp?: number;
  /** When true, this dep is actively failing this tick. */
  isFailing?: boolean;
  /** When set, this dep is explicitly failing this tick — emit error-tier condition unconditionally. */
  failingErrorType?: ErrorType;
}

function resolveInfraCondition(
  failingErrorType: ErrorType | undefined,
  isFailing: boolean,
  category: InfraCategory,
  rng: () => number
): {
  condition: (typeof INFRA_LOG_TYPES)[InfraCategory][number];
  level: 'info' | 'warn' | 'error';
} {
  if (failingErrorType != null) {
    return { condition: INFRA_ERROR_CONDITIONS[category][0], level: 'error' };
  }
  const { error: errorThreshold, warn: warnThreshold } = isFailing ? FAILING_PROBS : NORMAL_PROBS;
  const roll = rng();
  if (roll < errorThreshold) {
    return { condition: INFRA_ERROR_CONDITIONS[category][0], level: 'error' };
  }
  if (roll < warnThreshold) {
    const conditions = INFRA_WARN_CONDITIONS[category];
    const warnOnly = conditions.length > 1 ? conditions.slice(0, -1) : conditions;
    return { condition: warnOnly[Math.floor(rng() * warnOnly.length)], level: 'warn' };
  }
  return { condition: 'healthy', level: 'info' };
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
}: InfraLogOptions): Partial<LogDocument> | null {
  const category = DEP_TO_CATEGORY[infraDep];
  if (!category) return null;

  const { condition, level } = resolveInfraCondition(failingErrorType, isFailing, category, rng);

  const metadata = cachedMetadata ?? getOrBuildMetadata(service, seed);
  const messageOverrides: Record<string, string> = {};
  if (metadata['k8s.pod.name']) {
    messageOverrides.pod_name = metadata['k8s.pod.name'] as string;
  }
  if (metadata['k8s.namespace.name']) {
    messageOverrides.namespace = metadata['k8s.namespace.name'] as string;
  }
  if (metadata['k8s.node.name']) {
    messageOverrides.node_name = metadata['k8s.node.name'] as string;
  }
  if (metadata['container.name']) {
    messageOverrides.container_name = metadata['container.name'] as string;
  }
  if (metadata['host.name']) {
    messageOverrides.node_name = metadata['host.name'] as string;
  }

  const message = pickInfraMessage({
    category,
    condition,
    seed,
    tech: infraDep,
    overrides: messageOverrides,
    timestamp,
    serviceName: service.name,
  });

  return buildLogDoc({ service, level, message, metadata });
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
  const doc = generateInfraLog({
    service,
    infraDep: dep,
    rng,
    seed,
    isFailing,
    cachedMetadata,
    timestamp,
    failingErrorType,
  });
  if (!doc) return [];
  return [doc];
}

export interface HostSystemLogOptions extends Omit<ServicePhaseOptions, 'timestamp'> {
  timestamp?: number;
  /**
   * K8s-specific error type to emit for pod events when service is failing.
   * Only k8s_oom and k8s_crash_loop_back produce host-level pod events.
   */
  errorType?: 'k8s_oom' | 'k8s_crash_loop_back';
}

export function generateHostSystemLog({
  service,
  seed,
  cachedMetadata,
  timestamp,
  errorType,
}: HostSystemLogOptions): Partial<LogDocument> | null {
  const metadata = cachedMetadata ?? getOrBuildMetadata(service, seed);
  // Use an offset seed so host rolls are independent from infra dep rolls.
  const isAbnormal = mulberry32(seed + 2882395572)() < HOST_NORMAL_RESOURCE_PROB;

  if (metadata['k8s.pod.name']) {
    const k8sCondition =
      errorType != null ? K8S_ERROR_CONDITION[errorType] : isAbnormal ? 'scheduling' : 'healthy';
    const level: 'info' | 'warn' | 'error' =
      errorType != null ? 'error' : isAbnormal ? 'warn' : 'info';
    const messageOverrides: Record<string, string> = {
      ...(metadata['k8s.pod.name'] && { pod_name: metadata['k8s.pod.name'] as string }),
      ...(metadata['k8s.namespace.name'] && {
        namespace: metadata['k8s.namespace.name'] as string,
      }),
      ...(metadata['k8s.node.name'] && { node_name: metadata['k8s.node.name'] as string }),
      ...(metadata['k8s.container.name'] && {
        container_name: metadata['k8s.container.name'] as string,
      }),
    };

    const message = pickInfraMessage({
      category: 'kubernetes',
      condition: k8sCondition,
      seed,
      tech: 'kubelet',
      overrides: messageOverrides,
      timestamp,
      serviceName: service.name,
    });
    return buildLogDoc({ service, level, message, metadata });
  }

  const level = isAbnormal ? 'warn' : 'info';
  const osType = (metadata['os.type'] as string | undefined) ?? 'linux';
  const message = pickInfraMessage({
    category: 'host',
    condition: isAbnormal ? 'resource' : 'healthy',
    seed,
    tech: osType,
    timestamp,
    serviceName: service.name,
  });
  return buildLogDoc({ service, level, message, metadata });
}
