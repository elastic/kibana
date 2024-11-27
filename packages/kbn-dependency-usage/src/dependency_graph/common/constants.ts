/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const aggregationGroups = [
  'x-pack/plugins',
  'x-pack/packages',
  'src/plugins',
  'packages',
  'src',
  'x-pack/test',
  'x-pack/test_serverless',
];

export const excludePaths = [
  '(^|/)target($|/)',
  '^kbn',
  '^@kbn',
  '^.buildkite',
  '^docs',
  '^dev_docs',
  '^examples',
  '^scripts',
  '^bazel',
  '^x-pack/examples',
  '^oas_docs',
  '^api_docs',
  '^kbn_pm',
  '^.es',
  '^.codeql',
  '^.github',
];
