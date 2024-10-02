/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultConfig } from '@kbn/storybook';
import { Options } from '@storybook/core-common';
import path from 'path';
import webpack from 'webpack';

module.exports = {
  ...defaultConfig,
  define: {
    global: 'window',
  },
  stories: ['../../**/*.stories.+(tsx|mdx)'],
  webpackFinal: async (config: webpack.Configuration, options: Options) => {
    const originalConfig = await defaultConfig.webpackFinal!(config, options);

    originalConfig!.resolve!.alias!['../public/services/kibana_services'] = path.resolve(
      __dirname,
      '../public/services/mock_kibana_services'
    );
    return originalConfig;
  },
};
