/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as path from 'path';
import { StorybookConfig } from '@storybook/core-common';
import { Configuration } from 'webpack';
import webpackMerge from 'webpack-merge';
import { REPO_ROOT } from './constants';
import { default as WebpackConfig } from '../webpack.config';

const toPath = (_path: string) => path.join(REPO_ROOT, _path);
export const defaultConfig: StorybookConfig = {
  addons: ['@kbn/storybook/preset', '@storybook/addon-a11y', '@storybook/addon-essentials'],
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

    config.node = { fs: 'empty' };

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
