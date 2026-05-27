/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Project } from '@playwright/test';
import { SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import {
  generateTestRunId,
  scoutFailedTestsReporter,
  scoutFailureSummaryReporter,
  scoutPlaywrightReporter,
} from '@kbn/scout-reporting';
import { VALID_CONFIG_MARKER } from '../types';
import { createPlaywrightConfig } from './create_config';

// Playwright's `teardown` is a project-config option (Project<>) but isn't part of the
// runtime `Project` interface used in expectations; cast to access it in assertions.
type PlaywrightProject = Project & { teardown?: string };

jest.mock('@kbn/scout-reporting', () => ({
  ...jest.requireActual('@kbn/scout-reporting'),
  generateTestRunId: jest.fn(),
  scoutPlaywrightReporter: jest.fn(),
  scoutFailedTestsReporter: jest.fn(),
  scoutFailureSummaryReporter: jest.fn(),
}));

describe('createPlaywrightConfig', () => {
  const mockedRunId = 'mocked-run-id';
  const mockGenerateTestRunId = generateTestRunId as jest.Mock;
  const mockedScoutPlaywrightReporter = scoutPlaywrightReporter as jest.Mock;
  const mockedScoutFailedTestsReporter = scoutFailedTestsReporter as jest.Mock;
  const mockedScoutFailureSummaryReporter = scoutFailureSummaryReporter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TEST_RUN_ID;
  });

  it('should return a valid default Playwright configuration', () => {
    mockGenerateTestRunId.mockImplementationOnce(() => mockedRunId);
    // Scout reporters are disabled by default
    mockedScoutPlaywrightReporter.mockReturnValueOnce(['null']);
    mockedScoutFailedTestsReporter.mockReturnValueOnce(['null']);
    mockedScoutFailureSummaryReporter.mockReturnValueOnce(['null']);

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
      ignoreHTTPSErrors: true,
    });
    expect(config.globalSetup).toBeUndefined();
    expect(config.globalTeardown).toBeUndefined();
    expect(config.reporter).toEqual([
      ['html', { open: 'never', outputFolder: './.scout/reports' }],
      ['json', { outputFile: './.scout/reports/test-results.json' }],
      ['null'],
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
    mockedScoutFailureSummaryReporter.mockReturnValueOnce([
      '@kbn/scout-reporting/src/reporting/playwright/failure_summary',
      { name: 'scout-failure-summary', runId: mockedRunId },
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
      [
        '@kbn/scout-reporting/src/reporting/playwright/failure_summary',
        { name: 'scout-failure-summary', runId: mockedRunId },
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

  it('should add global.setup.ts and global.teardown.ts projects when runGlobalSetup is true', () => {
    const testDir = './my_tests';
    const defaultGlobalHookTimeout = 180000;

    const config = createPlaywrightConfig({ testDir, runGlobalSetup: true });
    expect(config.workers).toBe(1);

    // 3 base projects (local/ech/mki) × 3 hook projects each (setup, main, teardown)
    expect(config.projects).toHaveLength(9);

    const projectNames = config.projects!.map((p) => p.name);
    expect(projectNames).toEqual([
      'setup-local',
      'local',
      'teardown-local',
      'setup-ech',
      'ech',
      'teardown-ech',
      'setup-mki',
      'mki',
      'teardown-mki',
    ]);

    for (const projectName of ['local', 'ech', 'mki']) {
      const setup = config.projects!.find((p) => p.name === `setup-${projectName}`);
      const main = config.projects!.find((p) => p.name === projectName);
      const teardown = config.projects!.find((p) => p.name === `teardown-${projectName}`);

      expect(setup).toBeDefined();
      expect(setup!.testMatch).toEqual(/global.setup\.ts/);
      expect(setup!.timeout).toBe(defaultGlobalHookTimeout);
      // teardown is wired via Playwright's per-project `teardown` field, not `dependencies`,
      // so it runs after setup AND every project depending on it has finished — even on
      // test failure. https://playwright.dev/docs/test-projects#teardown
      expect((setup as PlaywrightProject).teardown).toBe(`teardown-${projectName}`);

      expect(main).toBeDefined();
      expect(main).toHaveProperty('dependencies', [`setup-${projectName}`]);
      expect(main).not.toHaveProperty('timeout');

      expect(teardown).toBeDefined();
      // The teardown project is always emitted; if a plugin doesn't ship `global.teardown.ts`,
      // the regex matches no files and Playwright silently skips the project — opt-in by file
      // presence with no extra config flag required.
      expect(teardown!.testMatch).toEqual(/global.teardown\.ts/);
      expect(teardown!.timeout).toBe(defaultGlobalHookTimeout);
    }
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
