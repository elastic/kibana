/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */
import { externals } from '@kbn/ui-shared-deps-src';
import { resolve } from 'path';
import type { Configuration } from 'webpack';
import { merge as webpackMerge } from 'webpack-merge';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import { REPO_ROOT } from './lib/constants';
import { IgnoreNotFoundExportPlugin } from './ignore_not_found_export_plugin';
import 'webpack-dev-server'; // Extends webpack configuration with `devServer` property

export default ({ config: storybookConfig }: { config: Configuration }) => {
  const config: Configuration = {
    devServer: {
      devMiddleware: {
        stats: 'errors-only',
      },
    },
    externals,
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
        {
          test: /\.(html|md|txt|tmpl)$/,
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
    plugins: [new NodeLibsBrowserPlugin(), new IgnoreNotFoundExportPlugin()],
    resolve: {
      extensions: ['.js', '.mjs', '.ts', '.tsx', '.json', '.mdx'],
      mainFields: ['browser', 'main'],
      alias: {
        core_styles: resolve(REPO_ROOT, 'src/core/public/index.scss'),
      },
    },
    stats: 'errors-only',
  };

  return webpackMerge(storybookConfig, config);
};
