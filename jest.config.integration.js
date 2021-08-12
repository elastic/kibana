/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  preset: '@kbn/test/jest_integration',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/packages', '<rootDir>/x-pack'],
  testPathIgnorePatterns: [
    '<rootDir>/x-pack/test/',

    // https://github.com/elastic/kibana/issues/108440
    '<rootDir>/x-pack/plugins/task_manager/server/integration_tests/managed_configuration.test.ts',
  ],
};
