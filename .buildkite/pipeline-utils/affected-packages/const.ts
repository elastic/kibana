/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const CRITICAL_FILES_JEST_UNIT_TESTS = [
  'scripts/jest.js',
  'scripts/jest_all.js',
  'package.json',
  'yarn.lock',
  'tsconfig.json',
  '.moon/workspace.yml',
  'src/platform/packages/shared/kbn-test/**/*',
];

export const NO_SELECTIVE_TESTS_LABEL = 'ci:no-selective-tests';
