/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { externals } from '@kbn/ui-shared-deps-src';
import { stringifyRequest } from 'loader-utils';
import { resolve } from 'path';
import webpack, { Configuration, Stats } from 'webpack';
import webpackMerge from 'webpack-merge';
import { REPO_ROOT } from './lib/constants';
import { IgnoreNotFoundExportPlugin } from './ignore_not_found_export_plugin';

type Preset = string | [string, Record<string, unknown>] | Record<string, unknown>;

const stats = {
  ...Stats.presetToOptions('minimal'),
  colors: true,
  errorDetails: true,
  errors: true,
  moduleTrace: true,
};

function isProgressPlugin(plugin: any) {
  return 'handler' in plugin && plugin.showActiveModules && plugin.showModules;
}

function isHtmlPlugin(plugin: any): plugin is { options: { template: string } } {
  return !!(typeof plugin.options?.template === 'string');
}

interface BabelLoaderRule extends webpack.RuleSetRule {
  use: webpack.RuleSetLoader[];
}

function isBabelLoaderRule(rule: webpack.RuleSetRule): rule is BabelLoaderRule {
  return !!(
    rule.use &&
    Array.isArray(rule.use) &&
    rule.use.some(
      (l) =>
        typeof l === 'object' && typeof l.loader === 'string' && l.loader.includes('babel-loader')
    )
  );
}

function getPresetPath(preset: Preset) {
  if (typeof preset === 'string') return preset;
  if (Array.isArray(preset)) return preset[0];
  return undefined;
}

function getTsPreset(preset: Preset) {
  if (getPresetPath(preset)?.includes('preset-typescript')) {
    if (typeof preset === 'string') return [preset, {}];
    if (Array.isArray(preset)) return preset;

    throw new Error('unsupported preset-typescript format');
  }
}

function isDesiredPreset(preset: Preset) {
  return !getPresetPath(preset)?.includes('preset-flow');
}

// Extend the Storybook Webpack config with some customizations
/* eslint-disable import/no-default-export */
export default ({ config: storybookConfig }: { config: Configuration }) => {
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
                additionalData(content: string, loaderContext: any) {
                  return `@import ${stringifyRequest(
                    loaderContext,
                    resolve(REPO_ROOT, 'src/core/public/core_app/styles/_globals_v8light.scss')
                  )};\n${content}`;
                },
                implementation: require('node-sass'),
                sassOptions: {
                  includePaths: [resolve(REPO_ROOT, 'node_modules')],
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [new IgnoreNotFoundExportPlugin()],
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.json', '.mdx'],
      mainFields: ['browser', 'main'],
      alias: {
        core_app_image_assets: resolve(REPO_ROOT, 'src/core/public/core_app/images'),
        core_styles: resolve(REPO_ROOT, 'src/core/public/index.scss'),
      },
      symlinks: false,
    },
    stats,
  };

  const updatedModuleRules = [];
  // clone and modify the module.rules config provided by storybook so that the default babel plugins run after the typescript preset
  for (const originalRule of storybookConfig.module?.rules ?? []) {
    const rule = { ...originalRule };
    updatedModuleRules.push(rule);

    if (isBabelLoaderRule(rule)) {
      rule.use = [...rule.use];
      const loader = (rule.use[0] = { ...rule.use[0] });
      const options = (loader.options = { ...(loader.options as Record<string, any>) });

      // capture the plugins defined at the root level
      const plugins: string[] = options.plugins ?? [];
      options.plugins = [];

      // move the plugins to the top of the preset array so they will run after the typescript preset
      options.presets = [
        {
          plugins: [...plugins, require.resolve('@kbn/babel-plugin-synthetic-packages')],
        },
        ...(options.presets as Preset[]).filter(isDesiredPreset).map((preset) => {
          const tsPreset = getTsPreset(preset);
          if (!tsPreset) {
            return preset;
          }

          return [
            tsPreset[0],
            {
              ...tsPreset[1],
              allowNamespaces: true,
              allowDeclareFields: true,
            },
          ];
        }),
      ];
    }
  }

  // copy and modify the webpack plugins added by storybook
  const filteredStorybookPlugins = [];
  for (const plugin of storybookConfig.plugins ?? []) {
    // Remove the progress plugin
    if (isProgressPlugin(plugin)) {
      continue;
    }

    // This is the hacky part. We find something that looks like the
    // HtmlWebpackPlugin and mutate its `options.template` to point at our
    // revised template.
    if (isHtmlPlugin(plugin)) {
      plugin.options.template = require.resolve('../templates/index.ejs');
    }

    filteredStorybookPlugins.push(plugin);
  }

  return webpackMerge(
    {
      ...storybookConfig,
      plugins: filteredStorybookPlugins,
      module: {
        ...storybookConfig.module,
        rules: updatedModuleRules,
      },
    },
    config
  );
};
