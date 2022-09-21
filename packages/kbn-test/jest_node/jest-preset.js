/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const preset = require('../jest-preset');

const presetClone = { ...preset };

delete presetClone.testEnvironment; // simply redefining as `testEnvironment: 'node'` has some weird side-effects (https://github.com/elastic/kibana/pull/138877#issuecomment-1222366247)

module.exports = {
  ...presetClone,
  snapshotSerializers: [],
  setupFiles: ['<rootDir>/node_modules/@kbn/test/target_node/jest/setup/babel_polyfill.js'],
  haste: {
    ...preset.haste,
    throwOnModuleCollision: true,
  },
};
