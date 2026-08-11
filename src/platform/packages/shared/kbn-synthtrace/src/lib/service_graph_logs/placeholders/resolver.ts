/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mulberry32, randHex } from './rng';
import { toPascalCase, toSnakeCase, toJavaPkg, toGrpcSvc } from './utils';

export interface FillPlaceholdersOptions {
  serviceName?: string | undefined;
  overrides?: Record<string, string>;
}

interface ResolverCtx {
  rng: () => number;
  svc: string;
  cache: Record<string, string>;
}

export function fillPlaceholders(
  template: string,
  seed: number,
  options: FillPlaceholdersOptions = {}
): string {
  const { serviceName, overrides } = options;
  const rng = mulberry32(seed);
  const svc = serviceName ?? 'service';
  const cache: Record<string, string> = {};

  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      cache[k] = v;
    }
  }

  cache.app_pascal ??= toPascalCase(svc);
  cache.app_snake ??= toSnakeCase(svc);
  cache.app_pkg ??= toJavaPkg(svc);
  cache.grpc_svc ??= toGrpcSvc(cache.target_svc ?? svc);

  const ctx: ResolverCtx = { rng, svc, cache };

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (key in cache) {
      return cache[key];
    }

    const resolve = RESOLVERS[key];
    const val = resolve ? resolve(ctx) : `{${key}}`;
    cache[key] = val;
    return val;
  });
}

type ResolverFn = (ctx: ResolverCtx) => string;

/**
 * Dynamic placeholder resolvers consulted after the pre-seeded cache.
 **/
const RESOLVERS: Record<string, ResolverFn> = {
  conn_id: (c) => `conn-${randHex(c.rng, 4)}`,
  request_id: (c) => randHex(c.rng, 32),
  hash: (c) => randHex(c.rng, 8),
  thread: (c) => `${c.cache.app_snake}-worker-0`,
  db_host: (c) => `${c.svc}-db.svc.cluster.local`,
  db_name: (c) => `${c.cache.app_snake}-db`,
  infra_host: (c) => `${c.cache.infra_dep ?? c.svc}.svc.cluster.local`,
  table: (c) => c.cache.app_snake,
  topic: (c) => `${c.cache.app_snake}.events`,
  consumer_group: (c) => `${c.svc}-consumer-group`,
  upstream_host: (c) => `${c.cache.target_svc ?? c.svc}.svc.cluster.local`,
  upstream_status: () => '500',
  user_id: (c) => `user-${randHex(c.rng, 8)}`,
};
