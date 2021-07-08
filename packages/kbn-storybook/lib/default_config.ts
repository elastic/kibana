/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as path from 'path';
import { StorybookConfig } from '@storybook/core/types';
import { REPO_ROOT } from './constants';

const toPath = (_path: string) => path.join(REPO_ROOT, _path);
export const defaultConfig: StorybookConfig = {
  addons: ['@kbn/storybook/preset', '@storybook/addon-a11y', '@storybook/addon-essentials'],
  stories: ['../**/*.stories.tsx'],
  typescript: {
    reactDocgen: false,
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
