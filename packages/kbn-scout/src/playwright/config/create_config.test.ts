/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SCOUT_REPORTER_ENABLED, SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import { createPlaywrightConfig } from './create_config';
import { VALID_CONFIG_MARKER } from '../types';
import { generateTestRunId } from '@kbn/scout-reporting';

jest.mock('@kbn/scout-reporting', () => ({
  ...jest.requireActual('@kbn/scout-reporting'),
  generateTestRunId: jest.fn(),
}));

describe('createPlaywrightConfig', () => {
  const mockGenerateTestRunId = generateTestRunId as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid default Playwright configuration', () => {
    const testRunId = 'test-run-id';
    mockGenerateTestRunId.mockImplementationOnce(() => testRunId);

    const testDir = './my_tests';
    const config = createPlaywrightConfig({ testDir });

    expect(mockGenerateTestRunId).toHaveBeenCalledTimes(1);

    expect(config.testDir).toBe(testDir);
    expect(config.retries).toBe(0);
    expect(config.workers).toBe(1);
    expect(config.fullyParallel).toBe(false);
    expect(config.use).toEqual({
      serversConfigDir: SCOUT_SERVERS_ROOT,
      [VALID_CONFIG_MARKER]: true,
      screenshot: 'only-on-failure',
      testIdAttribute: 'data-test-subj',
      trace: 'on-first-retry',
    });
    expect(config.globalSetup).toBeUndefined();
    expect(config.globalTeardown).toBeUndefined();
    expect(config.reporter).toEqual([
      ['html', { open: 'never', outputFolder: './output/reports' }],
      ['json', { outputFile: './output/reports/test-results.json' }],
      SCOUT_REPORTER_ENABLED
        ? [
            '@kbn/scout-reporting/src/reporting/playwright/events',
            { name: 'scout-playwright', runId: testRunId },
          ]
        : ['null'],
      [
        '@kbn/scout-reporting/src/reporting/playwright/failed_test',
        { name: 'scout-playwright-failed-tests', runId: testRunId },
      ],
    ]);
    expect(config.timeout).toBe(60000);
    expect(config.expect?.timeout).toBe(10000);
    expect(config.outputDir).toBe('./output/test-artifacts');
    expect(config.projects![0].name).toEqual('chromium');
  });

  it(`should override 'workers' count in Playwright configuration`, () => {
    const testDir = './my_tests';
    const workers = 2;

    const config = createPlaywrightConfig({ testDir, workers });
    expect(config.workers).toBe(workers);
  });
});
