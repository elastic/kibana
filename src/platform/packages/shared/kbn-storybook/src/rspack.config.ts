/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import type { Configuration } from '@rspack/core';
import { externals } from '@kbn/ui-shared-deps-src';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import { REPO_ROOT } from './lib/constants';
import { IgnoreNotFoundExportPlugin } from './ignore_not_found_export_plugin';

export const createStorybookRspackConfig = (config: Configuration): Configuration => ({
  ...config,
  externals,
  module: {
    ...config.module,
    rules: [
      ...(config.module?.rules ?? []),
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.(html|md|txt|tmpl|yaml|yml)$/,
        type: 'asset/source',
      },
      {
        test: /\.peggy$/,
        use: {
          loader: require.resolve('@kbn/peggy-loader'),
        },
      },
      {
        test: /\.text$/,
        use: {
          loader: require.resolve('@kbn/dot-text-loader'),
        },
      },
    ],
  },
  plugins: [
    ...(config.plugins ?? []),
    new NodeLibsBrowserPlugin(),
    new IgnoreNotFoundExportPlugin(),
  ],
  resolve: {
    ...config.resolve,
    extensions: ['.js', '.mjs', '.ts', '.tsx', '.json', '.mdx'],
    mainFields: ['browser', 'main'],
    alias: {
      ...config.resolve?.alias,
      core_styles: resolve(REPO_ROOT, 'src/core/public/index.scss'),
    },
  },
  stats: 'errors-only',
});
