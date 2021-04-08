/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';

export const KIBANA_ROOT = path.resolve(__dirname, '../../../../..');
export const TS_CONFIG_TEMPLATE = path.resolve(__dirname, './template_tsconfig.json');
export const TS_CONFIG_TEST_TEMPLATE = path.resolve(__dirname, './test_tsconfig.json');

export const PROJECT_TS_CONFIG_FILES = [
  path.resolve(KIBANA_ROOT, 'src/plugins/dashboard', 'tsconfig.json'),
  path.resolve(KIBANA_ROOT, 'src/plugins/presentation_util', 'tsconfig.json'),
  path.resolve(KIBANA_ROOT, 'src/plugins/visualize', 'tsconfig.json'),
  path.resolve(KIBANA_ROOT, 'x-pack/plugins/canvas', 'tsconfig.json'),
];

export const TS_CONFIG_FILES = [
  path.resolve(KIBANA_ROOT, 'tsconfig.json'),
  path.resolve(KIBANA_ROOT, 'tsconfig.base.json'),
  path.resolve(KIBANA_ROOT, 'test', 'tsconfig.json'),
  path.resolve(KIBANA_ROOT, 'x-pack/test', 'tsconfig.json'),
  ...PROJECT_TS_CONFIG_FILES,
] as const;
