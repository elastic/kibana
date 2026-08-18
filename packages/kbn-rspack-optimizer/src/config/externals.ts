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
 * Returns true when the import is `react-redux` originating from a kea
 * node_modules context.  kea depends on an older react-redux (v7) and
 * must be redirected to `react-redux-v7` so it shares the same React
 * context as the `<Provider>` used by consumers like enterprise_search.
 *
 * Use this in:
 * - externals callbacks: skip externalizing so the NormalModuleReplacementPlugin fires
 * - NormalModuleReplacementPlugin: redirect `react-redux` → `react-redux-v7`
 */
export function isKeaReactReduxImport(
  context: string | undefined,
  request: string | undefined
): boolean {
  return !!context && request === 'react-redux' && /node_modules[\\/]kea/.test(context);
}

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
