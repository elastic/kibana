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
import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { TEST_FLAG_OPTIONS } from '../playwright/runner';
import { parseTestFlags, runTests } from '../playwright/runner';

export const runScoutPlaywrightConfig = async (flagsReader: FlagsReader, log: ToolingLog) => {
  const options = await parseTestFlags(flagsReader);

  if (options.logsDir) {
    await initLogsDir(log, options.logsDir);
  }

  await runTests(log, options);
};

/**
 * Start servers and run the tests
 */
export const runTestsCmd: Command<void> = {
  name: 'run-tests',
  description: `
  Run a Scout Playwright config.

  Note:
    This also handles server starts. Make sure a Scout test server is not already running before invoking this command.

  Common usage:
    Running tests against local servers:
    node scripts/scout run-tests --stateful --config <playwright_config_path>
    node scripts/scout run-tests --serverless=es --headed --config <playwright_config_path>

    Running tests against Cloud deployment / MKI project:
    node scripts/scout run-tests --stateful --testTarget=cloud --config <playwright_config_path>
    node scripts/scout run-tests --serverless=es --testTarget=cloud --config <playwright_config_path>
  `,
  flags: TEST_FLAG_OPTIONS,
  run: async ({ flagsReader, log }) => {
    await runScoutPlaywrightConfig(flagsReader, log);
  },
};
