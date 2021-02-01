/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Configuration } from 'webpack';
import { defaultConfig } from '@kbn/storybook';
import webpackConfig from '@kbn/storybook/target/webpack.config';

module.exports = {
  ...defaultConfig,
  addons: ['@storybook/addon-essentials'],
  webpackFinal: (config: Configuration) => {
    return webpackConfig({ config });
  },
};
