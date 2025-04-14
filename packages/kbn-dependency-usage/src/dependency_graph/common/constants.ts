/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const aggregationGroups = [
  'x-pack/solutions/observability/plugins',
  'x-pack/solutions/observability/packages',
  'x-pack/solutions/security/plugins',
  'x-pack/solutions/security/packages',
  'x-pack/solutions/search/plugins',
  'x-pack/solutions/search/packages',
  'x-pack/platform/plugins',
  'x-pack/platform/packages',
  'x-pack/packages',
  'src/platform/plugins',
  'src/platform/packages',
  'src/core/packages',
  'packages',
  'src',
  'x-pack/test',
  'x-pack/test_serverless',
  'test',
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
