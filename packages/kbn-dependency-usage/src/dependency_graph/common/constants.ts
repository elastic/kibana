/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: This cannot be imported until Kibana supports ESM
// import { KIBANA_SOLUTIONS } from '@kbn/projects-solutions-groups';
const KIBANA_SOLUTIONS = ['observability', 'security', 'search', 'chat'] as const;

export const aggregationGroups: string[] = [
  ...KIBANA_SOLUTIONS.flatMap((solution) => [
    `x-pack/solutions/${solution}/plugins`,
    `x-pack/solutions/${solution}/packages`,
  ]),
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

export const excludePaths: string[] = [
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
