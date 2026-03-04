/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const INFRA_DEP_MAP = {
  database: { category: 'database', tech: ['postgres', 'mongodb', 'elasticsearch'] },
  message_queue: { category: 'message_queue', tech: ['kafka'] },
  cache: { category: 'cache', tech: ['redis'] },
} as const;

export type InfraCategory = 'database' | 'message_queue' | 'cache' | 'kubernetes' | 'host';
export type InfraDependency = (typeof INFRA_DEP_MAP)[keyof typeof INFRA_DEP_MAP]['tech'][number];
export type InfraDatabase = (typeof INFRA_DEP_MAP)['database']['tech'][number];
export type InfraMessageQueue = (typeof INFRA_DEP_MAP)['message_queue']['tech'][number];
export type InfraCache = (typeof INFRA_DEP_MAP)['cache']['tech'][number];

/** tech → infra category reverse lookup. */
export const DEP_TO_CATEGORY: Record<InfraDependency, InfraCategory> = Object.fromEntries(
  Object.entries(INFRA_DEP_MAP).flatMap(([cat, { tech }]) =>
    tech.map((t) => [t, cat as InfraCategory])
  )
) as Record<InfraDependency, InfraCategory>;

/** Condition keys per infra category: 'healthy' plus named failure conditions, each mapping to a `{ warn, error }` pool. */
export const INFRA_LOG_TYPES = {
  database: ['healthy', 'db_timeout'] as const,
  message_queue: ['healthy', 'broker_down'] as const,
  cache: ['healthy', 'eviction'] as const,
  kubernetes: ['healthy', 'oom', 'crash_loop_backoff'] as const,
  host: ['healthy', 'resource_pressure'] as const,
} satisfies Record<InfraCategory, readonly string[]>;

export const INFRA_FAIL_CONDITION = {
  database: 'db_timeout',
  message_queue: 'broker_down',
  cache: 'eviction',
  host: 'resource_pressure',
} as const;

export type InfraLogType = {
  [C in keyof typeof INFRA_LOG_TYPES]: (typeof INFRA_LOG_TYPES)[C][number];
};

/** Seed offset for the log-level RNG, keeping level rolls independent of message-pick draws. */
export const LEVEL_RNG_SEED_OFFSET = 2882395572;

/** Seed offset to pick the kubelet error message independently from the warn message. */
export const KUBELET_ERROR_SEED_OFFSET = 1;

/** Log level probabilities used by all channels via `resolveLogLevel`. Warns outnumber errors (~3:1) in the failing state. */
export const HEALTH_PROBS = {
  normal: { error: 0, warn: 0.05 },
  failing: { error: 0.15, warn: 0.65 },
} as const;

export const DOWNSTREAM_ATTEMPT_ON_ERROR_PROB = 0.3;
export const HTTP_200_PROB = 0.9;

export const ERROR_LATENCY_BASE_MS = 3000;
export const ERROR_LATENCY_JITTER_MS = 5000;
export const SUCCESS_LATENCY_BASE_MS = 5;
export const SUCCESS_LATENCY_JITTER_MS = 120;

export const PROTOCOLS = ['http', 'grpc', 'kafka'] as const;
export type Protocols = (typeof PROTOCOLS)[number];
export const ASYNC_PROTOCOLS = new Set<Protocols>(['kafka']);
export const RUNTIMES = ['go', 'python', 'java', 'node'] as const;
export type Runtime = (typeof RUNTIMES)[number];

export const OS_OPTIONS = [
  { type: 'linux', name: 'Debian GNU/Linux', version: '12 (bookworm)' },
] as const;
