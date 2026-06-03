/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Translate a Hapi-style route path to the Fastify (`find-my-way`) syntax.
 *
 * - `{name}`  → `:name`
 * - `{name?}` → `:name?`
 * - `{any*}`  → `*`           (catch-all; only valid as the last segment)
 *
 * @internal
 */
export function translateHapiPathToFastify(path: string): string {
  return path
    .replace(/\{([a-zA-Z0-9_]+)\*\}/g, '*')
    .replace(/\{([a-zA-Z0-9_]+)\?\}/g, ':$1?')
    .replace(/\{([a-zA-Z0-9_]+)\}/g, ':$1');
}

/**
 * Returns the original Hapi wildcard parameter name from a path like
 * `/foo/{path*}` (returns `'path'`), or `undefined` if there is none.
 *
 * Needed because find-my-way exposes catch-all matches under `params['*']` while Kibana
 * routes - and therefore the validation declared via `@kbn/config-schema` - reference
 * the named param.
 *
 * @internal
 */
export function extractHapiWildcardName(path: string): string | undefined {
  const match = path.match(/\{([a-zA-Z0-9_]+)\*\}/);
  return match ? match[1] : undefined;
}
