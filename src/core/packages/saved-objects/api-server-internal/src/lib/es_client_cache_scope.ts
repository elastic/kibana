/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';

/**
 * Credential scope of the Elasticsearch client a saved objects repository
 * authenticates as. Shared by every repository built from that client, including
 * `asScopedToNamespace` copies. Untagged clients get a stable per-client id so
 * two different clients never collapse onto one scope.
 */
const credentialScopes = new WeakMap<object, string | null>();
const untaggedScopes = new WeakMap<object, string>();

/** Scope for the Kibana internal user. One principal, shared across internal readers. */
export const INTERNAL_SAVED_OBJECTS_CACHE_SCOPE = 'internal';

export function associateEsClientCacheScope(client: object, scope: string | null): void {
  credentialScopes.set(client, scope);
}

export function readEsClientCacheScope(client: object): string | null {
  if (credentialScopes.has(client)) {
    return credentialScopes.get(client) ?? null;
  }

  const existing = untaggedScopes.get(client);
  if (existing !== undefined) {
    return existing;
  }

  const scope = `untagged:${randomUUID()}`;
  untaggedScopes.set(client, scope);
  return scope;
}
