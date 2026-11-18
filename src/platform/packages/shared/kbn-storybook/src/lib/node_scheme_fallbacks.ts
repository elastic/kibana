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

/** Resolves `node:` builtins (required by Jest 30's jest-util via the preview's jest-mock) to browser polyfills. */
export const withNodeSchemeFallbacks = (config: Configuration): Configuration => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
      const request = resource.request as keyof typeof nodeStdlibBrowser;
      resource.request = nodeStdlibBrowser[request] ?? resource.request.slice('node:'.length);
    }),
  ],
  resolve: {
    ...config.resolve,
    fallback: {
      ...config.resolve?.fallback,
      // jest-util only reads `util/types` in `isError`, when the browser lacks `Error.isError`.
      'util/types': false,
    },
  },
});
