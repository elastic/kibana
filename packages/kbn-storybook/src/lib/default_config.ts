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
import type { StorybookConfig } from '@storybook/core-common';
import webpack, { Configuration } from 'webpack';
import { merge as webpackMerge } from 'webpack-merge';
import { REPO_ROOT } from './constants';
import { default as WebpackConfig } from '../webpack.config';

const MOCKS_DIRECTORY = '__storybook_mocks__';
const EXTENSIONS = ['.ts', '.js'];

export type { StorybookConfig };

const toPath = (_path: string) => path.join(REPO_ROOT, _path);

// This ignore pattern excludes all of node_modules EXCEPT for `@kbn`.  This allows for
// changes to packages to cause a refresh in Storybook.
const IGNORE_GLOBS = [
  '**/node_modules/**',
  '!**/node_modules/@kbn/**',
  '!**/node_modules/@kbn/*/**',
  '!**/node_modules/@kbn/*/!(node_modules)/**',
];

export const defaultConfig: StorybookConfig = {
  addons: ['@kbn/storybook/preset', '@storybook/addon-a11y', '@storybook/addon-essentials'],
  core: {
    builder: 'webpack5',
  },
  stories: ['../**/*.stories.tsx', '../**/*.stories.mdx'],
  typescript: {
    reactDocgen: false,
  },
  features: {
    postcss: false,
  },
  // @ts-expect-error StorybookConfig type is incomplete
  // https://storybook.js.org/docs/react/configure/babel#custom-configuration
  babel: async (options) => {
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
  webpackFinal: (config, options) => {
    if (process.env.CI) {
      config.parallelism = 4;
      config.cache = true;
    }

    // This will go over every component which is imported and check its import statements.
    // For every import which starts with ./ it will do a check to see if a file with the same name
    // exists in the __storybook_mocks__ folder. If it does, use that import instead.
    // This allows you to mock hooks and functions when rendering components in Storybook.
    // It is akin to Jest's manual mocks (__mocks__).
    config.plugins?.push(
      new webpack.NormalModuleReplacementPlugin(/^\.\//, async (resource: any) => {
        if (!resource.contextInfo.issuer?.includes('node_modules')) {
          const mockedPath = path.resolve(resource.context, MOCKS_DIRECTORY, resource.request);

          EXTENSIONS.forEach((ext) => {
            const isReplacementPathExists = fs.existsSync(mockedPath + ext);

            if (isReplacementPathExists) {
              const newImportPath = './' + path.join(MOCKS_DIRECTORY, resource.request);
              resource.request = newImportPath;
            }
          });
        }
      })
    );

    // Same, but for imports statements which import modules outside of the directory (../)
    config.plugins?.push(
      new webpack.NormalModuleReplacementPlugin(/^\.\.\//, async (resource: any) => {
        if (!resource.contextInfo.issuer?.includes('node_modules')) {
          const prs = path.parse(resource.request);

          const mockedPath = path.resolve(resource.context, prs.dir, MOCKS_DIRECTORY, prs.base);

          EXTENSIONS.forEach((ext) => {
            const isReplacementPathExists = fs.existsSync(mockedPath + ext);

            if (isReplacementPathExists) {
              const newImportPath = prs.dir + '/' + path.join(MOCKS_DIRECTORY, prs.base);
              resource.request = newImportPath;
            }
          });
        }
      })
    );

    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config?.resolve?.fallback,
        fs: false,
      },
    };
    config.watch = true;
    config.watchOptions = {
      ...config.watchOptions,
      ignored: IGNORE_GLOBS,
    };

    // Remove when @storybook has moved to @emotion v11
    // https://github.com/storybookjs/storybook/issues/13145
    const emotion11CompatibleConfig = {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@emotion/core': toPath('node_modules/@emotion/react'),
          '@emotion/styled': toPath('node_modules/@emotion/styled'),
          'emotion-theming': toPath('node_modules/@emotion/react'),
        },
      },
    };

    return emotion11CompatibleConfig;
  },
};

// defaultConfigWebFinal and mergeWebpackFinal have been moved here  because webpackFinal usage in
// storybook main.ts somehow is  causing issues with newly added dependency of ts-node most likely
// an issue with storybook typescript setup see this issue for more details
// https://github.com/storybookjs/storybook/issues/9610

export const defaultConfigWebFinal: StorybookConfig = {
  ...defaultConfig,
  webpackFinal: (config: Configuration) => {
    return WebpackConfig({ config });
  },
};

export const mergeWebpackFinal = (extraConfig: Configuration) => {
  return { webpackFinal: (config: Configuration) => webpackMerge(config, extraConfig) };
};
