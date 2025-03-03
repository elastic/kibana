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
import { resolve, join, parse } from 'path';
import webpack, { type Configuration, type Compiler } from 'webpack';
import fs from 'fs';
import { merge as webpackMerge } from 'webpack-merge';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import { REPO_ROOT } from './lib/constants';
import { IgnoreNotFoundExportPlugin } from './ignore_not_found_export_plugin';
import 'webpack-dev-server'; // Extends webpack configuration with `devServer` property

type Preset = string | [string, Record<string, unknown>] | Record<string, unknown>;

function isProgressPlugin(plugin: any) {
  return 'handler' in plugin && plugin.showActiveModules && plugin.showModules;
}

interface BabelLoaderRule extends webpack.RuleSetRule {
  use: Array<{
    loader: 'babel-loader';
    [key: string]: unknown;
  }>;
}

function isBabelLoaderRule(rule: webpack.RuleSetRule): rule is BabelLoaderRule {
  return !!(
    rule.use &&
    Array.isArray(rule.use) &&
    rule.use.some(
      (l) =>
        typeof l === 'object' && typeof l?.loader === 'string' && l?.loader.includes('babel-loader')
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

const MOCKS_DIRECTORY = '__storybook_mocks__';
const EXTENSIONS = ['.ts', '.js'];

// This ignore pattern excludes all of node_modules EXCEPT for `@kbn`.  This allows for
// changes to packages to cause a refresh in Storybook.
const IGNORE_GLOBS = [
  '**/node_modules/**',
  '!**/node_modules/@kbn/**',
  '!**/node_modules/@kbn/*/**',
  '!**/node_modules/@kbn/*/!(node_modules)/**',
];

const createMockPlugin = (pattern: RegExp) => {
  return {
    apply(compiler: Compiler) {
      compiler.hooks.normalModuleFactory.tap('MockReplacementPlugin', (factory) => {
        factory.hooks.beforeResolve.tap('MockReplacementPlugin', (resolveData: any) => {
          if (!resolveData) return;

          const { request, context, contextInfo } = resolveData;

          // Skip node_modules
          if (contextInfo.issuer?.includes('node_modules')) return;

          // Only process requests matching our pattern
          if (pattern.test(request)) {
            if (request.startsWith('./')) {
              // Handle ./ imports
              const mockedPath = resolve(context, MOCKS_DIRECTORY, request.slice(2));

              for (const ext of EXTENSIONS) {
                if (fs.existsSync(mockedPath + ext)) {
                  resolveData.request = './' + join(MOCKS_DIRECTORY, request.slice(2));
                  break;
                }
              }
            } else if (request.startsWith('../')) {
              // Handle ../ imports
              const prs = parse(request);
              const mockedPath = resolve(context, prs.dir, MOCKS_DIRECTORY, prs.base);

              for (const ext of EXTENSIONS) {
                if (fs.existsSync(mockedPath + ext)) {
                  resolveData.request = prs.dir + '/' + join(MOCKS_DIRECTORY, prs.base);
                  break;
                }
              }
            }
          }

          // Don't return anything (or return undefined) to continue with the module
          // Return false only if you want to prevent the module from being created
        });
      });
    },
  };
};

// Extend the Storybook Webpack config with some customizations
/**
 * @returns {import('webpack').Configuration}
 */
export default async ({ config: storybookConfig }: { config: Configuration }) => {
  const config: Configuration = {
    devServer: {
      devMiddleware: {
        stats: 'errors-only',
      },
    },
    externals,
    module: {
      // no parse rules for a few known large packages which have no require() statements
      // or which have require() statements that should be ignored because the file is
      // already bundled with all its necessary dependencies
      noParse: [/[\/\\]node_modules[\/\\]vega[\/\\]build-es5[\/\\]vega\.js$/],
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
          test: /\.scss$/,
          exclude: /\.module.(s(a|c)ss)$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader', options: { importLoaders: 2 } },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  config: require.resolve('@kbn/optimizer/postcss.config'),
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                additionalData(content: string, loaderContext: any) {
                  const req = JSON.stringify(
                    loaderContext.utils.contextify(
                      loaderContext.context || loaderContext.rootContext,
                      resolve(REPO_ROOT, 'src/core/public/styles/core_app/_globals_v8light.scss')
                    )
                  );
                  return `@import ${req};\n${content}`;
                },
                implementation: require('sass-embedded'),
                sassOptions: {
                  includePaths: [resolve(REPO_ROOT, 'node_modules')],
                  quietDeps: true,
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [new NodeLibsBrowserPlugin(), new IgnoreNotFoundExportPlugin()],
    resolve: {
      extensions: ['.js', '.mjs', '.ts', '.tsx', '.json', '.mdx'],
      mainFields: ['browser', 'main'],
      alias: {
        core_app_image_assets: resolve(REPO_ROOT, 'src/core/public/styles/core_app/images'),
        core_styles: resolve(REPO_ROOT, 'src/core/public/index.scss'),
        vega: resolve(REPO_ROOT, 'node_modules/vega/build-es5/vega.js'),
      },
      fallback: {
        timers: false,
      },
    },
    stats: 'errors-only',
  };

  if (process.env.CI) {
    config.parallelism = 4;
    config.cache = true;
  }

  config.plugins = config.plugins || [];
  config.plugins.push(createMockPlugin(/^\.\//)); // For ./ imports
  config.plugins.push(createMockPlugin(/^\.\.\//)); // For ../ imports

  config.watchOptions = {
    ...config.watchOptions,
    ignored: IGNORE_GLOBS,
  };

  // Override storybookConfig mainFields instead of merging with config
  delete storybookConfig.resolve?.mainFields;

  const updatedModuleRules: webpack.RuleSetRule[] = [];
  // clone and modify the module.rules config provided by storybook so that the default babel plugins run after the typescript preset
  for (const originalRule of storybookConfig.module?.rules ?? []) {
    const rule = typeof originalRule !== 'string' ? { ...originalRule } : {};
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
        require.resolve('@kbn/babel-preset/common_preset'),
        { plugins },
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

    filteredStorybookPlugins.push(plugin);
  }

  return webpackMerge<object>(
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
