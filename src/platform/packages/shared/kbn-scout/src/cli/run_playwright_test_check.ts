/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Command } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { runPlaywrightTestCheck } from '../playwright/runner';

export const runScoutPlaywrightConfig = async (log: ToolingLog) => {
  await runPlaywrightTestCheck(log);
};

/**
 * Validates that the Playwright 'test' command can run successfully
 */
export const runPlaywrightTestCheckCmd: Command<void> = {
  name: 'run-playwright-test-check',
  description: `
  Run a Playwright test command check.

  Common usage:
    node scripts/scout run-playwright-test-check
  `,
  run: async ({ log }) => {
    await runScoutPlaywrightConfig(log);
  },
};
