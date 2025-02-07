/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import { scoutPlaywrightReporter, scoutFailedTestsReporter } from '@kbn/scout-reporting';
import { createPlaywrightConfig } from './create_config';
import { VALID_CONFIG_MARKER } from '../types';
import { generateTestRunId } from '@kbn/scout-reporting';

jest.mock('@kbn/scout-reporting', () => ({
  ...jest.requireActual('@kbn/scout-reporting'),
  generateTestRunId: jest.fn(),
  scoutPlaywrightReporter: jest.fn(),
  scoutFailedTestsReporter: jest.fn(),
}));

describe('createPlaywrightConfig', () => {
  const mockedRunId = 'mocked-run-id';
  const mockGenerateTestRunId = generateTestRunId as jest.Mock;
  const mockedScoutPlaywrightReporter = scoutPlaywrightReporter as jest.Mock;
  const mockedScoutFailedTestsReporter = scoutFailedTestsReporter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TEST_RUN_ID;
  });

  it('should return a valid default Playwright configuration', () => {
    mockGenerateTestRunId.mockImplementationOnce(() => mockedRunId);
    // Scout reporters are disabled by default
    mockedScoutPlaywrightReporter.mockReturnValueOnce(['null']);
    mockedScoutFailedTestsReporter.mockReturnValueOnce(['null']);

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
      ['null'],
      ['null'],
    ]);
    expect(config.timeout).toBe(60000);
    expect(config.expect?.timeout).toBe(10000);
    expect(config.outputDir).toBe('./output/test-artifacts');
    expect(config.projects![0].name).toEqual('chromium');
  });

  it('should return a Playwright configuration with Scout reporters', () => {
    mockGenerateTestRunId.mockImplementationOnce(() => mockedRunId);
    mockedScoutPlaywrightReporter.mockReturnValueOnce([
      '@kbn/scout-reporting/src/reporting/playwright/events',
      { name: 'scout-playwright', runId: mockedRunId },
    ]);
    mockedScoutFailedTestsReporter.mockReturnValueOnce([
      '@kbn/scout-reporting/src/reporting/playwright/failed_test',
      { name: 'scout-playwright-failed-tests', runId: mockedRunId },
    ]);

    const testDir = './my_tests';
    const config = createPlaywrightConfig({ testDir });

    expect(mockGenerateTestRunId).toHaveBeenCalledTimes(1);
    expect(config.reporter).toEqual([
      ['html', { open: 'never', outputFolder: './output/reports' }],
      ['json', { outputFile: './output/reports/test-results.json' }],
      [
        '@kbn/scout-reporting/src/reporting/playwright/events',
        { name: 'scout-playwright', runId: mockedRunId },
      ],
      [
        '@kbn/scout-reporting/src/reporting/playwright/failed_test',
        { name: 'scout-playwright-failed-tests', runId: mockedRunId },
      ],
    ]);
  });

  it(`should override 'workers' count in Playwright configuration`, () => {
    const testDir = './my_tests';
    const workers = 2;

    const config = createPlaywrightConfig({ testDir, workers });
    expect(config.workers).toBe(workers);
  });

  it('should generate and cache runId in process.env.TEST_RUN_ID', () => {
    mockGenerateTestRunId.mockReturnValue(mockedRunId);

    // First call to create config
    createPlaywrightConfig({ testDir: 'tests' });
    expect(process.env.TEST_RUN_ID).toBe(mockedRunId);

    // Second call (should use the cached value)
    createPlaywrightConfig({ testDir: 'tests' });

    expect(generateTestRunId).toHaveBeenCalledTimes(1);
    expect(process.env.TEST_RUN_ID).toBe(mockedRunId);
  });
});
