/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { defaultConfig } from '@kbn/storybook';
import webpackMerge from 'webpack-merge';
import { resolve } from 'path';

const mockConfig = {
  resolve: {
    alias: {
      '@kbn/esql/public': resolve(__dirname, '../public/mocks/text_based_languages_editor.tsx'),
    },
  },
};

module.exports = {
  ...defaultConfig,
  webpackFinal: (config) => webpackMerge(config, mockConfig),
};
