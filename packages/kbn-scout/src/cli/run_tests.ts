/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Command } from '@kbn/dev-cli-runner';
import { initLogsDir } from '@kbn/test';
import { TEST_FLAG_OPTIONS } from '../playwright/runner';
import { parseTestFlags, runTests as runTestsFn } from '../playwright/runner';

/**
 * Start servers and run the tests
 */
export const runTests: Command<void> = {
  name: 'run-tests',
  description: `
  Run a Scout Playwright config.

  Note:
    This also handles server starts. Make sure a Scout test server is not already running before invoking this command.

  Common usage:
    node scripts/scout run-tests --stateful --config <playwright_config_path>
    node scripts/scout run-tests --serverless=es --headed --config <playwright_config_path>
  `,
  flags: TEST_FLAG_OPTIONS,
  run: async ({ flagsReader, log }) => {
    const options = await parseTestFlags(flagsReader);

    if (options.logsDir) {
      await initLogsDir(log, options.logsDir);
    }

    await runTestsFn(log, options);
  },
};
