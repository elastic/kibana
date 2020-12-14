/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

module.exports = {
  rootDir: '.',
  projects: [
    '<rootDir>/packages/*/jest.config.js',
    '<rootDir>/src/*/jest.config.js',
    '<rootDir>/src/legacy/*/jest.config.js',
    '<rootDir>/src/plugins/*/jest.config.js',
    '<rootDir>/test/*/jest.config.js',
    ...require('./x-pack/jest.config').projects,
  ],
  reporters: ['default', '<rootDir>/packages/kbn-test/target/jest/junit_reporter'],
};
