/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
// import { log } from './lib/logger';

const dotEnvPath = process.env.DOTENV_PATH ?? path.join(__dirname, '.env');

dotenv.config({ path: dotEnvPath });

export const STORAGE_STATE = path.join(
  __dirname,
  './x-pack/plugins/observability_solution/observability_onboarding/e2e/playwright/.playwright/.auth/user.json'
);

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  testDir: './x-pack/plugins/observability_solution/observability_onboarding/e2e/playwright/',
  outputDir:
    './x-pack/plugins/observability_solution/observability_onboarding/e2e/playwright/.playwright',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  // workers: 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    [process.env.CI ? 'json' : 'json'],
    [
      'json',
      {
        outputFile:
          './x-pack/plugins/observability_solution/observability_onboarding/e2e/playwright/.playwright/results.json',
      },
    ],
  ],
  /* Timeouts */
  timeout: 120000,
  expect: { timeout: 120000 },

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.KIBANA_HOST,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    testIdAttribute: 'data-test-subj',
    video: {
      mode: 'off',
      size: { width: 1920, height: 1200 },
    },

    permissions: ['clipboard-read'],
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'auth',
      testMatch: 'auth.ts',
      use: {
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          logger: {
            isEnabled: () => true,
            // eslint-disable-next-line no-console
            log: (name, severity, message) => console.log(`[${severity}] ${name} ${message}`),
          },
        },
      },
    },
    {
      name: 'teardown',
      testMatch: 'teardown.setup.ts',
      use: {
        viewport: { width: 1920, height: 1080 },
        storageState: STORAGE_STATE,
        testIdAttribute: 'data-test-subj',
        launchOptions: {
          logger: {
            isEnabled: () => true,
            // eslint-disable-next-line no-console
            log: (name, severity, message) => console.log(`[${severity}] ${name} ${message}`),
          },
        },
      },
    },
    {
      name: 'stateful',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1200 },
        storageState: STORAGE_STATE,
        launchOptions: {
          logger: {
            isEnabled: () => true,
            // eslint-disable-next-line no-console
            log: (name, severity, message) => console.log(`[${severity}] ${name} ${message}`),
          },
        },
      },
      dependencies: ['auth'],
    },
  ],
});
