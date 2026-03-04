/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ErrorType,
  InfraCategory,
  InfraDependency,
  InfraPool,
  NoiseHealthState,
  Protocols,
  Runtime,
  ServiceErrorType,
} from '../types';
import { fillPlaceholders, mulberry32, pick } from '../placeholders';
import type { InfraCache, InfraDatabase, InfraMessageQueue } from '../constants';
import type { INFRA_LOG_TYPES } from '../constants';
import { RUNTIMES } from '../constants';
import { SERVICE, TECH_KEYED_ERROR_TYPES, NOISE, INFRA } from '../log_catalog';
import type { ConditionPool, OutboundErrorCategory } from '../log_catalog';

function pickRuntime(seed: number): Runtime {
  return RUNTIMES[Math.abs(seed) % RUNTIMES.length];
}

export function getStackTrace({
  runtime,
  seed,
  serviceName,
}: {
  runtime: Runtime;
  seed: number;
  serviceName?: string;
}): string {
  const pool = SERVICE.stackTraces[runtime];
  if (!pool || pool.length === 0) return '';
  const template = pool[Math.abs(seed) % pool.length];
  return fillPlaceholders(template, seed, { serviceName });
}

export function pickHealthyMessage({
  seed,
  tickSeed,
  runtime,
  serviceName,
  overrides,
  infraDeps,
  overridePool,
}: {
  seed: number;
  tickSeed?: number;
  runtime?: Runtime;
  serviceName?: string;
  overrides?: Record<string, string>;
  infraDeps?: readonly InfraDependency[];
  overridePool?: string[];
}): string {
  if (overridePool && overridePool.length > 0) {
    const template = pick(overridePool, mulberry32(seed));
    return fillPlaceholders(template, tickSeed ?? seed, { serviceName, overrides });
  }

  const rt = runtime ?? pickRuntime(seed);
  const always = SERVICE.request.success.always[rt] ?? SERVICE.request.success.always.go!;
  const applicable: string[] = [...(always ?? [])];

  for (const dep of infraDeps ?? []) {
    const pool =
      SERVICE.request.success.database?.[rt]?.[dep as InfraDatabase] ??
      SERVICE.request.success.cache?.[rt]?.[dep as InfraCache] ??
      SERVICE.request.success.messageQueue?.[rt]?.[dep as InfraMessageQueue];
    if (pool) applicable.push(...pool);
  }

  const template = pick(applicable, mulberry32(seed));
  return fillPlaceholders(template, tickSeed ?? seed, { serviceName, overrides });
}

function resolveMessagePool(
  errorType: ErrorType,
  level: 'warn' | 'error',
  rt: Runtime,
  sourceDep?: InfraDependency
): string[] {
  const pool = SERVICE.request.messages[errorType as ServiceErrorType];
  if (!pool) return [];

  if (TECH_KEYED_ERROR_TYPES.has(errorType as ServiceErrorType)) {
    const techKeyed = pool as Record<string, Record<Runtime, ConditionPool>>;
    const techPool = (sourceDep ? techKeyed[sourceDep] : undefined) ?? Object.values(techKeyed)[0];
    return (techPool?.[rt] ?? techPool?.go)?.[level] ?? [];
  }

  const flat = pool as Record<Runtime, ConditionPool>;
  return (flat[rt] ?? flat.go)?.[level] ?? [];
}

function pickFromPool(
  errorType: ErrorType,
  level: 'warn' | 'error',
  seed: number,
  runtime: Runtime | undefined,
  sourceDep: InfraDependency | undefined,
  fallback: string
): string {
  const rt = runtime ?? pickRuntime(seed);
  const templates = resolveMessagePool(errorType, level, rt, sourceDep);
  return templates.length > 0 ? pick(templates, mulberry32(seed)) : fallback;
}

export function pickErrorMessage({
  errorType,
  seed,
  tickSeed,
  runtime,
  serviceName,
  overrides,
  sourceDep,
  overridePool,
}: {
  errorType: ServiceErrorType;
  seed: number;
  tickSeed?: number;
  runtime?: Runtime;
  serviceName?: string;
  overrides?: Record<string, string>;
  sourceDep?: InfraDependency;
  overridePool?: string[];
}): string {
  const template = overridePool?.length
    ? pick(overridePool, mulberry32(seed))
    : pickFromPool(
        errorType,
        'error',
        seed,
        runtime,
        sourceDep,
        `level=error msg="request failed" rid={request_id}`
      );
  return fillPlaceholders(template, tickSeed ?? seed, { serviceName, overrides });
}

export function pickWarnMessage({
  errorType,
  seed,
  tickSeed,
  runtime,
  serviceName,
  overrides,
  sourceDep,
}: {
  errorType: ErrorType;
  seed: number;
  tickSeed?: number;
  runtime?: Runtime;
  serviceName?: string;
  overrides?: Record<string, string>;
  sourceDep?: InfraDependency;
}): string {
  const template = pickFromPool(
    errorType,
    'warn',
    seed,
    runtime,
    sourceDep,
    `level=warn msg="request processing slow" elapsed_ms=1820 rid={request_id}`
  );
  return fillPlaceholders(template, tickSeed ?? seed, { serviceName, overrides });
}

export function pickNoiseMessage({
  seed,
  runtime,
  serviceName,
  overrides,
  infraDep,
  healthState = 'healthy',
}: {
  seed: number;
  runtime?: Runtime;
  serviceName?: string;
  overrides?: Record<string, string>;
  infraDep?: InfraDependency;
  healthState?: NoiseHealthState;
}): string {
  const rt = runtime ?? pickRuntime(seed);
  let templates = NOISE[healthState]?.[rt] ?? [];

  if (templates.length === 0) {
    templates = NOISE.healthy?.[rt] ?? NOISE.healthy?.go ?? [];
  }

  if (templates.length === 0) {
    return `[info] periodic check ok pid=${seed % 65535}`;
  }

  const template = pick(templates, mulberry32(seed));
  const merged = infraDep ? { ...overrides, infra_dep: infraDep } : overrides;
  return fillPlaceholders(template, seed, { serviceName, overrides: merged });
}

function deriveErrorCategory(httpStatus: number): OutboundErrorCategory | undefined {
  if (httpStatus === 504) return 'timeout';
  if (httpStatus === 502 || httpStatus === 503) return 'unavailable';
  return undefined;
}

export function pickOutboundMessage({
  seed,
  tickSeed,
  runtime,
  serviceName,
  targetService,
  protocol,
  httpStatus,
  latencyMs,
}: {
  seed: number;
  tickSeed?: number;
  runtime: Runtime;
  serviceName: string;
  targetService: string;
  protocol: Protocols;
  httpStatus: number;
  latencyMs: number;
}): { message: string; level: 'info' | 'error' } {
  const outbound = SERVICE.serviceCalls.outbound;
  const protocolKey = protocol === 'grpc' || protocol === 'kafka' ? protocol : 'http';
  const protocolPool = outbound[protocolKey];
  const isOk = httpStatus < 400;

  const category = isOk ? undefined : deriveErrorCategory(httpStatus);
  const template = isOk
    ? protocolPool.success[runtime]
    : (category && protocolPool.error[category]?.[runtime]) ?? protocolPool.error.failed[runtime];

  if (!template) {
    return {
      message: `Calling ${targetService} via ${protocol} -- ${httpStatus} in ${latencyMs}ms`,
      level: 'info',
    };
  }

  const outboundOverrides: Record<string, string> = {
    target_svc: targetService,
    call_protocol: protocol,
    call_status: String(httpStatus),
  };
  return {
    level: isOk ? 'info' : 'error',
    message: fillPlaceholders(template, tickSeed ?? seed, {
      serviceName,
      overrides: outboundOverrides,
    }),
  };
}

export function pickInfraMessage({
  category,
  condition,
  level: rawLevel,
  seed,
  tech,
  overrides,
  timestamp,
  serviceName,
}: {
  category: InfraCategory;
  condition: (typeof INFRA_LOG_TYPES)[InfraCategory][number];
  level?: 'info' | 'warn' | 'error';
  seed: number;
  tech?: string;
  overrides?: Record<string, string>;
  timestamp: number;
  serviceName?: string;
}): string {
  const level = rawLevel === 'info' ? undefined : rawLevel;
  const categoryData = INFRA[category] as Record<string, InfraPool<string> | undefined> | undefined;
  const techPool =
    (tech ? categoryData?.[tech] : undefined) ?? Object.values(categoryData ?? {})[0];

  const conditionData = techPool?.[condition];

  let templates: string[];
  if (Array.isArray(conditionData)) {
    templates = conditionData;
  } else if (conditionData != null) {
    templates = (level === 'warn' ? conditionData.warn : conditionData.error) ?? [];
  } else {
    templates = Array.isArray(techPool?.healthy) ? techPool?.healthy : [];
  }

  if (templates.length === 0) {
    return `[${category}:${tech ?? '?'}] ${condition} event`;
  }

  const ts = new Date(timestamp).toISOString();
  const template = pick(templates, mulberry32(seed));
  return fillPlaceholders(template, seed, {
    serviceName,
    overrides: { timestamp: ts, ...overrides },
  });
}
