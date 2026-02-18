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
  NoiseHealthState,
  Protocols,
  Runtime,
  ServiceErrorType,
} from '../types';
import { fillPlaceholders, mulberry32, pick } from '../placeholders';
import type { InfraCache, InfraDatabase, InfraMessageQueue } from '../constants';
import type { INFRA_LOG_TYPES } from '../constants';
import { SERVICE, TECH_KEYED_ERROR_TYPES } from '../log_mocks/service';
import type { OutboundTemplate } from '../log_mocks/service/utils';
import type { MessagePool } from '../log_mocks/service/errors';
import { NOISE } from '../log_mocks/noise';
import { INFRA } from '../log_mocks/infra';

function pickRuntime(seed: number): Runtime {
  const runtimes: Runtime[] = ['go', 'python', 'java', 'node'];
  return runtimes[Math.abs(seed) % runtimes.length];
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
    const dbPool = SERVICE.request.success.database?.[rt]?.[dep as InfraDatabase & string];

    if (dbPool) {
      applicable.push(...dbPool);
      continue;
    }
    const cachePool = SERVICE.request.success.cache?.[rt]?.[dep as InfraCache & string];

    if (cachePool) {
      applicable.push(...cachePool);
      continue;
    }
    const mqPool = SERVICE.request.success.messageQueue?.[rt]?.[dep as InfraMessageQueue & string];

    if (mqPool) {
      applicable.push(...mqPool);
    }
  }

  const template = pick(applicable, mulberry32(seed));
  return fillPlaceholders(template, tickSeed ?? seed, { serviceName, overrides });
}

/**
 * Resolves the warn or error template pool for a given error type, runtime, and optional infra dep.
 * Tech-keyed types (e.g. db_timeout) look up the dep-specific sub-pool first.
 */
function resolveMessagePool(
  errorType: ErrorType,
  level: 'warn' | 'error',
  rt: Runtime,
  sourceDep?: InfraDependency
): string[] {
  const pool = SERVICE.request.messages[errorType as ServiceErrorType];
  if (!pool) return [];

  if (TECH_KEYED_ERROR_TYPES.has(errorType as ServiceErrorType)) {
    const techKeyed = pool as Record<string, Record<Runtime, MessagePool>>;
    const techPool = (sourceDep ? techKeyed[sourceDep] : undefined) ?? Object.values(techKeyed)[0];
    return (techPool?.[rt] ?? techPool?.go)?.[level] ?? [];
  }

  const flat = pool as Record<Runtime, MessagePool>;
  return (flat[rt] ?? flat.go)?.[level] ?? [];
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
  if (overridePool && overridePool.length > 0) {
    const template = pick(overridePool, mulberry32(seed));
    return fillPlaceholders(template, tickSeed ?? seed, { serviceName, overrides });
  }
  const rt = runtime ?? pickRuntime(seed);
  const templates = resolveMessagePool(errorType, 'error', rt, sourceDep);
  const template =
    templates.length > 0
      ? pick(templates, mulberry32(seed))
      : `level=error msg="request failed" rid={request_id}`;
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
  const rt = runtime ?? pickRuntime(seed);
  const templates = resolveMessagePool(errorType, 'warn', rt, sourceDep);
  const template =
    templates.length > 0
      ? pick(templates, mulberry32(seed))
      : `level=warn msg="request processing slow" elapsed_ms=1820 rid={request_id}`;
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

export function pickOutboundMessages({
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
}): Array<{ message: string; level: 'info' | 'error' }> {
  const outbound = SERVICE.serviceCalls.outbound;
  const protocolKey = protocol === 'grpc' || protocol === 'kafka' ? protocol : 'http';
  const protocolPool = outbound[protocolKey];
  const isOk = httpStatus < 400;
  const pool = isOk ? protocolPool.ok : protocolPool.error;
  const entries: OutboundTemplate[] = pool[runtime] ?? pool.go ?? [];

  if (entries.length === 0) {
    return [
      {
        message: `Calling ${targetService} via ${protocol} -- ${httpStatus} in ${latencyMs}ms`,
        level: 'info',
      },
    ];
  }

  const outboundOverrides: Record<string, string> = {
    target_svc: targetService,
    call_protocol: protocol,
    call_status: String(httpStatus),
  };
  return entries.map(({ level, template }) => ({
    level,
    message: fillPlaceholders(template, tickSeed ?? seed, {
      serviceName,
      overrides: outboundOverrides,
    }),
  }));
}

export function pickInfraMessage({
  category,
  condition,
  seed,
  tech,
  overrides,
  timestamp,
  serviceName,
}: {
  category: InfraCategory;
  condition: (typeof INFRA_LOG_TYPES)[InfraCategory][number];
  seed: number;
  tech?: string;
  overrides?: Record<string, string>;
  timestamp?: number;
  serviceName?: string;
}): string {
  const categoryData = INFRA[category] as
    | Record<string, Record<string, string[]> | undefined>
    | undefined;
  const techPool = tech
    ? categoryData?.[tech] ?? Object.values(categoryData ?? {})[0]
    : Object.values(categoryData ?? {})[0];

  const templates: string[] = (techPool?.[condition] ?? techPool?.healthy ?? []) as string[];

  if (templates.length === 0) {
    return `[${category}:${tech ?? '?'}] ${condition} event`;
  }

  const ts = timestamp != null ? new Date(timestamp).toISOString() : new Date().toISOString();
  const template = pick(templates, mulberry32(seed));
  return fillPlaceholders(template, seed, {
    serviceName,
    overrides: { timestamp: ts, ...overrides },
  });
}
