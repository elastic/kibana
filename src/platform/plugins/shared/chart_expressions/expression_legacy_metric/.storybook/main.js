/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultConfig } from '@kbn/storybook';
import { merge as webpackMerge } from 'webpack-merge';
import { resolve } from 'path';

const mockConfig = {
  resolve: {
    alias: {
      '../../../../../expression_legacy_metric/public/services': resolve(
        __dirname,
        '../public/__mocks__/services.ts'
      ),
    },
  },
};

module.exports = {
  ...defaultConfig,
  webpackFinal: (config) => webpackMerge(config, mockConfig),
};
