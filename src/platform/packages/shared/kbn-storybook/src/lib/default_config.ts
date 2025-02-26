/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import fs from 'fs';
import type { StorybookConfig } from '@storybook/react-webpack5';
import type { Configuration, Compiler } from 'webpack';
import webpackMerge from 'webpack-merge';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';

const MOCKS_DIRECTORY = '__storybook_mocks__';
const EXTENSIONS = ['.ts', '.js'];

export type { StorybookConfig };

// This ignore pattern excludes all of node_modules EXCEPT for `@kbn`.  This allows for
// changes to packages to cause a refresh in Storybook.
const IGNORE_GLOBS = [
  '**/node_modules/**',
  '!**/node_modules/@kbn/**',
  '!**/node_modules/@kbn/*/**',
  '!**/node_modules/@kbn/*/!(node_modules)/**',
];

export const defaultConfig: StorybookConfig = {
  addons: [
    '@storybook/addon-webpack5-compiler-babel',
    '@kbn/storybook/preset',
    '@storybook/addon-a11y',
    '@storybook/addon-essentials',
  ],
  framework: '@storybook/react-webpack5',
  stories: ['../**/*.stories.tsx', '../**/*.mdx'],
  typescript: {
    reactDocgen: false,
    check: false,
  },
  staticDirs: [
    UiSharedDepsNpm.distDir,
    UiSharedDepsSrc.distDir,
    {
      from: path.resolve(__dirname, '../../../../../plugins/shared/kibana_react/public/assets'),
      to: 'plugins/kibanaReact/assets',
    },
  ],

  // @ts-expect-error StorybookConfig type is incomplete
  // https://storybook.js.org/docs/react/configure/babel#custom-configuration
  babel: async (options) => {
    options.presets = options.presets || [];
    options.presets.push([
      require.resolve('@emotion/babel-preset-css-prop'),
      {
        // There's an issue where emotion classnames may be duplicated,
        // (e.g. `[hash]-[filename]--[local]_[filename]--[local]`)
        // https://github.com/emotion-js/emotion/issues/2417
        autoLabel: 'always',
        labelFormat: '[filename]--[local]',
      },
    ]);
    return options;
  },
  webpackFinal: async (config: Configuration) => {
    if (process.env.CI) {
      config.parallelism = 4;
      config.cache = true;
    }

    // Create a custom mock replacement plugin
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
                  const mockedPath = path.resolve(context, MOCKS_DIRECTORY, request.slice(2));

                  for (const ext of EXTENSIONS) {
                    if (fs.existsSync(mockedPath + ext)) {
                      resolveData.request = './' + path.join(MOCKS_DIRECTORY, request.slice(2));
                      break;
                    }
                  }
                } else if (request.startsWith('../')) {
                  // Handle ../ imports
                  const prs = path.parse(request);
                  const mockedPath = path.resolve(context, prs.dir, MOCKS_DIRECTORY, prs.base);

                  for (const ext of EXTENSIONS) {
                    if (fs.existsSync(mockedPath + ext)) {
                      resolveData.request = prs.dir + '/' + path.join(MOCKS_DIRECTORY, prs.base);
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

    // Add custom plugins for ./ and ../ imports
    config.plugins = config.plugins || [];
    config.plugins.push(createMockPlugin(/^\.\//)); // For ./ imports
    config.plugins.push(createMockPlugin(/^\.\.\//)); // For ../ imports

    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config?.resolve?.fallback,
        fs: false,
      },
    };

    config.watchOptions = {
      ...config.watchOptions,
      ignored: IGNORE_GLOBS,
    };

    return config;
  },
};

// mergeWebpackFinal have been moved here  because webpackFinal usage in
// storybook main.ts somehow is  causing issues with newly added dependency of ts-node most likely
// an issue with storybook typescript setup see this issue for more details
// https://github.com/storybookjs/storybook/issues/9610

export const mergeWebpackFinal = (extraConfig: Configuration) => {
  return { webpackFinal: (config: Configuration) => webpackMerge(config, extraConfig) };
};
