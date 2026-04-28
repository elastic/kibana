/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import {
  generateTestRunId,
  scoutFailedTestsReporter,
  scoutPlaywrightReporter,
} from '@kbn/scout-reporting';
import { VALID_CONFIG_MARKER } from '../types';
import { createPlaywrightConfig } from './create_config';

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
      actionTimeout: 10000,
      navigationTimeout: 20000,
      screenshot: 'only-on-failure',
      testIdAttribute: 'data-test-subj',
      trace: 'on-first-retry',
      timezoneId: 'GMT',
    });
    expect(config.globalSetup).toBeUndefined();
    expect(config.globalTeardown).toBeUndefined();
    expect(config.reporter).toEqual([
      ['html', { open: 'never', outputFolder: './.scout/reports' }],
      ['json', { outputFile: './.scout/reports/test-results.json' }],
      ['null'],
      ['null'],
    ]);
    expect(config.timeout).toBe(60000);
    expect(config.expect?.timeout).toBe(10000);
    expect(config.outputDir).toBe('./.scout/test-artifacts');
    expect(config.projects).toHaveLength(3);
    expect(config.projects![0].name).toEqual('local');
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
      ['html', { open: 'never', outputFolder: './.scout/reports' }],
      ['json', { outputFile: './.scout/reports/test-results.json' }],
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

  it(`should override 'workers' count`, () => {
    const testDir = './my_tests';
    const workers = 2;

    const config = createPlaywrightConfig({ testDir, workers });
    expect(config.workers).toBe(workers);

    expect(config.projects).toHaveLength(3);
    expect(config.projects![0].name).toEqual('local');
    expect(config.projects![1].name).toEqual('ech');
    expect(config.projects![2].name).toEqual('mki');
  });

  it('should add global.setup.ts as pre-step when runGlobalSetup is true and apply default timeout', () => {
    const testDir = './my_tests';
    const defaultGlobalSetupTimeout = 180000;

    const config = createPlaywrightConfig({ testDir, runGlobalSetup: true });
    expect(config.workers).toBe(1);

    expect(config.projects).toHaveLength(6);
    expect(config.projects![0].name).toEqual('setup-local');
    expect(config.projects![0].testMatch).toEqual(/global.setup\.ts/);
    expect(config.projects![0].timeout).toBe(defaultGlobalSetupTimeout);
    expect(config.projects![1].name).toEqual('local');
    expect(config.projects![1]).toHaveProperty('dependencies', ['setup-local']);
    expect(config.projects![1]).not.toHaveProperty('timeout');
    expect(config.projects![2].name).toEqual('setup-ech');
    expect(config.projects![2].timeout).toBe(defaultGlobalSetupTimeout);
    expect(config.projects![3].name).toEqual('ech');
    expect(config.projects![3]).toHaveProperty('dependencies', ['setup-ech']);
    expect(config.projects![3]).not.toHaveProperty('timeout');
    expect(config.projects![4].name).toEqual('setup-mki');
    expect(config.projects![4].timeout).toBe(defaultGlobalSetupTimeout);
    expect(config.projects![5].name).toEqual('mki');
    expect(config.projects![5]).toHaveProperty('dependencies', ['setup-mki']);
    expect(config.projects![5]).not.toHaveProperty('timeout');
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
