/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const preset = require('../jest-preset');

module.exports = {
  ...preset,
  testEnvironment: 'node',
  snapshotSerializers: [],
  setupFiles: ['<rootDir>/node_modules/@kbn/test/target_node/jest/setup/babel_polyfill.js'],
  transform: {
    ...preset.transform,
    '^.+\\.(js|tsx?)$': '<rootDir>/node_modules/@kbn/test/target_node/jest/babel_transform_node.js',
  },
};
