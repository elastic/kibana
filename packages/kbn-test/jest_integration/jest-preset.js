/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const preset = require('../jest_integration_jsdom/jest-preset');

/** @typedef {import("@jest/types").Config.InitialOptions} JestConfig */
/** @type {JestConfig} */
module.exports = {
  ...preset,

  // The paths to modules that run some code to configure or set up the testing environment before each test
  setupFiles: ['<rootDir>/node_modules/@kbn/test/target_node/jest/setup/integration_setup.js'],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/@kbn/test/target_node/jest/setup/integration_after_env.js',
  ],

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  snapshotSerializers: [],

  // The test environment that will be used for testing
  testEnvironment: 'node',
};
