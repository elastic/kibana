/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '.',
  projects: [
    '<rootDir>/packages/*/jest.config.js',
    '<rootDir>/src/*/jest.config.js',
    '<rootDir>/src/plugins/*/jest.config.js',
    '<rootDir>/src/plugins/chart_expressions/*/jest.config.js',
    '<rootDir>/src/plugins/vis_types/*/jest.config.js',
    '<rootDir>/test/*/jest.config.js',
    '<rootDir>/x-pack/plugins/*/jest.config.js',
  ],
};
