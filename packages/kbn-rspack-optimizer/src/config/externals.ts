/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';

/**
 * Get externals mapping for shared dependencies.
 *
 * Spreads the canonical externals from @kbn/ui-shared-deps-src (the single
 * source of truth shared with the legacy webpack optimizer) so that any
 * addition there is automatically picked up here.
 */
export function getExternals(): Record<string, string> {
  return {
    ...UiSharedDepsSrc.externals,

    // Node.js built-ins (rspack-specific, for browser compatibility)
    'node:crypto': 'commonjs crypto',
  };
}

/**
 * Packages whose imports of certain shared deps should NOT be externalized.
 * This allows legacy packages (e.g. redux-toolkit-v1, kea) to resolve their
 * own nested dependency versions (e.g. immer v9) instead of the shared ones
 * (e.g. immer v10).
 */
export const SHARED_DEP_OVERRIDES: Array<{
  /** Regex matching the requesting module's context directory */
  contextPattern: RegExp;
  /** Shared dep module names to skip externalizing for this context */
  deps: string[];
  /** Optional: redirect the request to a different package name */
  redirect?: Record<string, string>;
}> = [
  {
    // redux-toolkit-v1 bundles its own immer v9, redux v4, etc.
    // RTK v1 calls immer's enableES5() which was removed in immer v10.
    contextPattern: /node_modules[\\/]redux-toolkit-v1/,
    deps: ['immer', '@reduxjs/toolkit', 'redux', 'react-redux', 'reselect'],
  },
  {
    // kea imports react-redux hooks (useSelector, etc.) which must share the
    // same React context as the <Provider> from react-redux-v7.
    contextPattern: /node_modules[\\/]kea/,
    deps: ['react-redux'],
    redirect: { 'react-redux': 'react-redux-v7' },
  },
];

/**
 * Externals as a function that skips shared dep externalization for specific
 * packages that need their own nested dependency versions.
 */
export function getExternalsFunction(): (
  data: { context?: string; request?: string },
  callback: (err?: Error, result?: string) => void
) => void {
  const sharedExternals: Record<string, string> = getExternals();

  return ({ context, request }, callback) => {
    if (context && request) {
      for (const override of SHARED_DEP_OVERRIDES) {
        if (override.contextPattern.test(context) && override.deps.includes(request)) {
          return callback();
        }
      }
    }

    if (request && request in sharedExternals) {
      return callback(undefined, sharedExternals[request]);
    }

    return callback();
  };
}
