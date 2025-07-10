/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineConfig, PlaywrightTestConfig, devices } from '@playwright/test';
import {
  scoutFailedTestsReporter,
  scoutPlaywrightReporter,
  generateTestRunId,
} from '@kbn/scout-reporting';
import { SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import { ScoutPlaywrightOptions, ScoutTestOptions, VALID_CONFIG_MARKER } from '../types';

export function createPlaywrightConfig(options: ScoutPlaywrightOptions): PlaywrightTestConfig {
  /**
   * Playwright loads the config file multiple times, so we need to generate a unique run id
   * and store it in the environment to be used across all config function calls.
   */
  let runId = process.env.TEST_RUN_ID;
  if (!runId) {
    runId = generateTestRunId();
    process.env.TEST_RUN_ID = runId;
  }

  const scoutDefaultProjects: PlaywrightTestConfig<ScoutTestOptions>['projects'] = [
    {
      name: 'local',
      use: { ...devices['Desktop Chrome'], configName: 'local' },
    },
    {
      name: 'ech',
      use: { ...devices['Desktop Chrome'], configName: 'cloud_ech' },
    },
    {
      name: 'mki',
      use: { ...devices['Desktop Chrome'], configName: 'cloud_mki' },
    },
  ];

  let scoutProjects: PlaywrightTestConfig<ScoutTestOptions>['projects'] = [];

  /**
   * For parallel tests, we need to add a setup as a project dependency. While Playwright doesn't allow to read 'use'
   * from the parent project, we have to create a setup project with the explicit 'use' object for each parent project.
   * This is a workaround for https://github.com/microsoft/playwright/issues/32547
   */
  scoutProjects =
    options.workers && options.workers > 1
      ? scoutDefaultProjects.flatMap((project) => [
          {
            name: `setup-${project?.name}`,
            use: project?.use ? { ...project.use } : {},
            testMatch: /global.setup\.ts/,
          },
          { ...project, dependencies: [`setup-${project?.name}`] },
        ])
      : scoutDefaultProjects;

  return defineConfig<ScoutTestOptions>({
    testDir: options.testDir,
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: 0, // disable retry for Playwright runner
    /* Opt out of parallel tests on CI. */
    workers: options.workers ?? 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
      ['html', { outputFolder: './output/reports', open: 'never' }], // HTML report configuration
      ['json', { outputFile: './output/reports/test-results.json' }], // JSON report
      scoutPlaywrightReporter({ name: 'scout-playwright', runId }), // Scout events report
      scoutFailedTestsReporter({ name: 'scout-playwright-failed-tests', runId }), // Scout failed test report
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
      actionTimeout: 10000, // Shorten timeout for actions like `click()`
      navigationTimeout: 20000, // Shorter timeout for page navigations
      // 'configName' is not defined by default to enforce using '--project' flag when running the tests
      testIdAttribute: 'data-test-subj',
      serversConfigDir: SCOUT_SERVERS_ROOT,
      [VALID_CONFIG_MARKER]: true,
      /* Base URL to use in actions like `await page.goto('/')`. */
      // baseURL: 'http://127.0.0.1:3000',

      /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      // video: 'retain-on-failure',
      // storageState: './output/reports/state.json', // Store session state (like cookies)
    },

    // Timeout for each test, includes test, hooks and fixtures
    timeout: 60000,

    // Timeout for each assertion
    expect: {
      timeout: 10000,
    },

    outputDir: './output/test-artifacts', // For other test artifacts (screenshots, videos, traces)

    projects: scoutProjects,
  });
}
