/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import webpack from 'webpack';
import type { Configuration } from 'webpack';
import nodeStdlibBrowser from 'node-stdlib-browser';

// `node-stdlib-browser` has no `util/types` entry. jest-util only reads it in `isError`, when the
// browser lacks `Error.isError`, so the `util` polyfill's type checks are enough.
const NODE_SCHEME_EXTRAS: Record<string, string> = {
  'node:util/types': require.resolve('util/support/types'),
};

/** Resolves `node:` builtins (required by Jest 30's jest-util via the preview's jest-mock) to browser polyfills. */
export const withNodeSchemeFallbacks = (config: Configuration): Configuration => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
      const request = resource.request as keyof typeof nodeStdlibBrowser;
      resource.request =
        NODE_SCHEME_EXTRAS[request] ??
        nodeStdlibBrowser[request] ??
        resource.request.slice('node:'.length);
    }),
  ],
});
