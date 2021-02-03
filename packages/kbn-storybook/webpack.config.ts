/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { stringifyRequest } from 'loader-utils';
import { Configuration, Stats } from 'webpack';
import webpackMerge from 'webpack-merge';
import { externals } from '@kbn/ui-shared-deps';
import { REPO_ROOT } from './lib/constants';

const stats = {
  ...Stats.presetToOptions('minimal'),
  colors: true,
  errorDetails: true,
  errors: true,
  moduleTrace: true,
  warningsFilter: /(export .* was not found in)|(entrypoint size limit)/,
};

// Extend the Storybook Webpack config with some customizations
/* eslint-disable import/no-default-export */
export default function ({ config: storybookConfig }: { config: Configuration }) {
  const config = {
    devServer: {
      stats,
    },
    externals,
    module: {
      rules: [
        {
          test: /\.(html|md|txt|tmpl)$/,
          use: {
            loader: 'raw-loader',
          },
        },
        {
          test: /\.scss$/,
          exclude: /\.module.(s(a|c)ss)$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader', options: { importLoaders: 2 } },
            {
              loader: 'postcss-loader',
              options: {
                config: {
                  path: require.resolve('@kbn/optimizer/postcss.config.js'),
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                prependData(loaderContext: any) {
                  return `@import ${stringifyRequest(
                    loaderContext,
                    resolve(REPO_ROOT, 'src/core/public/core_app/styles/_globals_v7light.scss')
                  )};\n`;
                },
                sassOptions: {
                  includePaths: [resolve(REPO_ROOT, 'node_modules')],
                },
              },
            },
          ],
        },
      ],
    },
    resolve: {
      // Tell Webpack about the scss extension
      extensions: ['.scss'],
      alias: {
        core_app_image_assets: resolve(REPO_ROOT, 'src/core/public/core_app/images'),
      },
    },
    stats,
  };

  // This is the hacky part. We find something that looks like the
  // HtmlWebpackPlugin and mutate its `options.template` to point at our
  // revised template.
  const htmlWebpackPlugin: any = (storybookConfig.plugins || []).find((plugin: any) => {
    return plugin.options && typeof plugin.options.template === 'string';
  });
  if (htmlWebpackPlugin) {
    htmlWebpackPlugin.options.template = require.resolve('../lib/templates/index.ejs');
  }
  return webpackMerge(storybookConfig, config);
}
