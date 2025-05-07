/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RawConfigService } from '@kbn/config';
import { VALID_SERVERLESS_PROJECT_MODE, compileConfigStack } from './compile_config_stack';
import { firstValueFrom } from 'rxjs';

// Arguably this test should live in a package, but it is intended to leverage
// disparate code modules to create snapshots of various serverless configurations.
describe('Serverless configuration snapshots', () => {
  const testCases = [
    { name: 'search', compilerOptions: { serverless: 'es' } },
    { name: 'observability', compilerOptions: { serverless: 'oblt' } },
    { name: 'security base tier', compilerOptions: { serverless: 'security' } },
    {
      name: 'security complete tier',
      compilerOptions: { serverless: 'security', securityProductTier: 'complete' },
    },
    {
      name: 'security essentials tier',
      compilerOptions: { serverless: 'security', securityProductTier: 'essentials' },
    },
    {
      name: 'security search ai lake tier',
      compilerOptions: { serverless: 'security', securityProductTier: 'search_ai_lake' },
    },
    { name: 'chat', compilerOptions: { serverless: 'chat' } },
  ];

  // If this test fails we neeed to update our test cases above, best-ish effort
  // hopefully we will find a better way to ensure coverage for product tiers
  // configuration.
  test('Checks test case coverage', () => {
    const projectModesInTestCases = new Set();
    testCases.forEach(
      ({ compilerOptions: { serverless } }) => void projectModesInTestCases.add(serverless)
    );
    expect(Array.from(projectModesInTestCases).sort()).toEqual(
      VALID_SERVERLESS_PROJECT_MODE.slice().sort()
    );
  });

  test.each(testCases)('Serverless $name should match snapshot', async ({ compilerOptions }) => {
    const configStack = compileConfigStack({ ...compilerOptions, dev: false });
    const configService = new RawConfigService(configStack);
    try {
      configService.loadConfig();
      const snapshot = await firstValueFrom(configService.config$);
      expect(snapshot).toMatchSnapshot();
    } finally {
      configService.stop();
    }
  });
});
