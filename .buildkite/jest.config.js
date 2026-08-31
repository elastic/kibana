/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { createJsWithTsEsmPreset } = require('ts-jest');
const { dirname } = require('node:path');

const tsJestTransformCfg = createJsWithTsEsmPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: require.resolve('jest-environment-node', { paths: [dirname(process.argv[1])] }),
  transform: {
    ...tsJestTransformCfg,
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@octokit/.*|universal-user-agent|before-after-hook|globby|unicorn-magic|is-path-inside|slash|@sindresorhus/merge-streams)/)',
  ],
  moduleNameMapper: {
    '^unicorn-magic/node$': '<rootDir>/node_modules/unicorn-magic/node.js',
  },
};
