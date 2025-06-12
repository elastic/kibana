/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const preset = require('../jest-preset');

const presetClone = { ...preset };

delete presetClone.testEnvironment; // simply redefining as `testEnvironment: 'node'` has some weird side-effects (https://github.com/elastic/kibana/pull/138877#issuecomment-1222366247)

/** @type {import("@jest/types").Config.InitialOptions} */
module.exports = {
  ...presetClone,
  snapshotSerializers: [],
  setupFiles: ['<rootDir>/src/setup_node_env/polyfill.ts'],
  haste: {
    ...preset.haste,
    throwOnModuleCollision: true,
  },
};
