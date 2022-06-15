/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import mockFs from 'mock-fs';

import { GroupedTestFiles } from './group_test_files';
import {
  findMissingConfigFiles,
  INTEGRATION_CONFIG_NAME,
  UNIT_CONFIG_NAME,
} from './find_missing_config_files';

beforeEach(async () => {
  mockFs({
    '/packages': {
      a: {
        [UNIT_CONFIG_NAME]: '{}',
      },
    },
    '/src': {
      c: {
        [UNIT_CONFIG_NAME]: '{}',
      },
      d: {
        [INTEGRATION_CONFIG_NAME]: '{}',
      },
    },
  });
});

afterEach(mockFs.restore);

it('returns a list of config files which are not found on disk, or are not files', async () => {
  const groups: GroupedTestFiles = new Map([
    [
      {
        type: 'pkg',
        path: '/packages/a',
      },
      {
        unit: ['/packages/a/test.js'],
      },
    ],
    [
      {
        type: 'pkg',
        path: '/packages/b',
      },
      {
        integration: ['/packages/b/integration_tests/test.js'],
      },
    ],
    [
      {
        type: 'src',
        path: '/src/c',
      },
      {
        unit: ['/src/c/test.js'],
        integration: ['/src/c/integration_tests/test.js'],
      },
    ],
    [
      {
        type: 'src',
        path: '/src/d',
      },
      {
        unit: ['/src/d/test.js'],
      },
    ],
  ]);

  await expect(findMissingConfigFiles(groups)).resolves.toEqual([
    '/packages/b/jest.integration.config.js',
    '/src/c/jest.integration.config.js',
    '/src/d/jest.config.js',
  ]);
});
