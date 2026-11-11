/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Configuration } from '@rspack/core';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import { VEGA_SANDBOX_BUNDLE_FILE } from '@kbn/vega-sandbox';
import { getMinimizer, getSwcOptions } from './shared_config';
import { resolveSharedAssetPaths } from './shared_asset_paths';

export const VEGA_SANDBOX_COMPILER = 'vega-sandbox';

/** Standalone iframe bundle: no Kibana externals, since the opaque iframe cannot see them. */
export function createVegaSandboxConfig({
  repoRoot,
  outputRoot = repoRoot,
  dist = false,
}: {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
}): Configuration {
  const { vegaSandboxPackageRoot, vegaSandboxOutput } = resolveSharedAssetPaths(
    repoRoot,
    outputRoot
  );

  return {
    name: VEGA_SANDBOX_COMPILER,
    context: vegaSandboxPackageRoot,
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-source-map',
    target: 'web',
    entry: {
      vega_sandbox: Path.resolve(vegaSandboxPackageRoot, 'src/bootstrap.ts'),
    },
    output: {
      path: vegaSandboxOutput,
      filename: VEGA_SANDBOX_BUNDLE_FILE,
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
    },
    module: {
      rules: [
        {
          test: /\.(jsx?|tsx?)$/,
          exclude: /node_modules(?![\\/]@kbn[\\/])([\\/][^\\/]+[\\/])/,
          loader: 'builtin:swc-loader',
          options: getSwcOptions(dist),
        },
      ],
    },
    optimization: dist ? { minimize: true, minimizer: getMinimizer(dist) } : { minimize: false },
    performance: {
      hints: false,
    },
    cache: false,
    plugins: [new NodeLibsBrowserPlugin() as any],
    stats: {
      preset: 'errors-warnings',
      timings: true,
    },
  };
}
