/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';

const DOCS_URL =
  'https://github.com/elastic/kibana/blob/main/src/core/packages/di/common/README.md';

/**
 * Returns a human-readable label for a {@link ServiceIdentifier}.
 *
 * Symbols created by `createToken` use `Symbol.for(name)`, so
 * `Symbol.description` gives back the original token name.
 * @internal
 */
const tokenLabel = (token: ServiceIdentifier): string => {
  if (typeof token === 'symbol') return token.description ?? token.toString();
  if (typeof token === 'function') return token.name;
  return String(token);
};

/**
 * Wraps an InversifyJS resolution error with an actionable message that
 * includes the token name, likely causes, and a link to the DI docs.
 *
 * Always throws — use inside a `catch` block.
 * @internal
 */
export const rethrowDiError = (token: ServiceIdentifier, cause: unknown): never => {
  const name = tokenLabel(token);
  const original = cause instanceof Error ? cause.message : String(cause);

  throw new Error(
    `Failed to resolve DI service "${name}": ${original}\n` +
      `  Possible causes:\n` +
      `    - The plugin that publishes "${name}" is disabled or has not started yet.\n` +
      `    - This plugin is missing "${name}" in plugin.globals.consumes (kibana.jsonc).\n` +
      `    - The publisher's services export did not call publish(token).\n` +
      `  See: ${DOCS_URL}`,
    { cause }
  );
};
