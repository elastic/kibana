/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Track active provider instances to detect potential cache key collisions.
 * Maps `entityName` → Set of explicitly provided `queryKeyScope` values.
 * @internal
 */
const activeProviders = new Map<string, Set<string>>();

/**
 * Warns in development when multiple providers share the same explicit `queryKeyScope`.
 *
 * Note: Since providers now auto-generate a unique `queryKeyScope` via `useId()` when not
 * explicitly provided, this warning only fires when a user explicitly passes the same
 * `queryKeyScope` value to multiple provider instances.
 *
 * When `queryKeyScope` is `undefined`, no tracking or warning occurs because the provider
 * will use an auto-generated unique scope internally.
 */
export const warnOnQueryKeyScopeCollision = (
  entityName: string,
  queryKeyScope: string | undefined
): (() => void) => {
  // Skip tracking for undefined scopes - providers auto-generate unique scopes internally.
  if (process.env.NODE_ENV !== 'development' || queryKeyScope === undefined) {
    return () => {};
  }

  const scopes = activeProviders.get(entityName) ?? new Set();

  if (scopes.has(queryKeyScope)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[ContentListProvider] Multiple providers detected with entityName="${entityName}"` +
        ` and queryKeyScope="${queryKeyScope}". ` +
        'This will cause React Query cache collisions. ' +
        'If this is intentional (shared cache), you can ignore this warning. ' +
        'Otherwise, provide a unique `queryKeyScope` prop to each provider instance.'
    );
  }

  scopes.add(queryKeyScope);
  activeProviders.set(entityName, scopes);

  // Return cleanup function to remove this instance on unmount.
  return () => {
    const currentScopes = activeProviders.get(entityName);
    if (currentScopes) {
      currentScopes.delete(queryKeyScope);
      if (currentScopes.size === 0) {
        activeProviders.delete(entityName);
      }
    }
  };
};
