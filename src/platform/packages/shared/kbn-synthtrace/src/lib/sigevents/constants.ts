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

/** Reverse lookup: tech name (e.g. 'postgres') → infra category (e.g. 'database'). Derived from INFRA_DEP_MAP. */
export const DEP_TO_CATEGORY: Record<InfraDependency, InfraCategory> = Object.fromEntries(
  Object.entries(INFRA_DEP_MAP).flatMap(([cat, { tech }]) =>
    tech.map((t) => [t, cat as InfraCategory])
  )
) as Record<InfraDependency, InfraCategory>;

export const INFRA_LOG_TYPES = {
  database: ['healthy', 'slow', 'connection_refused'] as const,
  message_queue: ['healthy', 'lag', 'broker_down'] as const,
  cache: ['healthy', 'eviction', 'connection_error'] as const,
  kubernetes: ['healthy', 'scheduling', 'oom', 'crash_loop_back'] as const,
  host: ['healthy', 'resource'] as const,
} satisfies Record<InfraCategory, readonly string[]>;

export const INFRA_WARN_CONDITIONS: Record<
  InfraCategory,
  (typeof INFRA_LOG_TYPES)[InfraCategory][number][]
> = {
  database: ['slow'],
  message_queue: ['lag'],
  cache: ['eviction'],
  kubernetes: ['scheduling'],
  host: ['resource'],
};

export const INFRA_ERROR_CONDITIONS: Record<
  InfraCategory,
  (typeof INFRA_LOG_TYPES)[InfraCategory][number][]
> = {
  database: ['connection_refused'],
  message_queue: ['broker_down'],
  cache: ['connection_error'],
  kubernetes: ['oom', 'crash_loop_back'],
  host: ['resource'],
};

export type InfraLogType = {
  [C in keyof typeof INFRA_LOG_TYPES]: (typeof INFRA_LOG_TYPES)[C][number];
};

export const PROTOCOLS = ['http', 'grpc', 'kafka'] as const;
export type Protocols = (typeof PROTOCOLS)[number];
export const ASYNC_PROTOCOLS = new Set<Protocols>(['kafka']);
export type Runtime = 'go' | 'python' | 'java' | 'node';

export const OS_OPTIONS = [
  { type: 'linux', name: 'Debian GNU/Linux', version: '12 (bookworm)' },
] as const;
