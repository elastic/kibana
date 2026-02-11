/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import { initLogsDir } from '@kbn/test';
import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
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
    On local stateful:
    node scripts/scout run-tests --arch stateful --domain classic --config <playwright_config_path>

    On local serverless:
    node scripts/scout run-tests --arch serverless --domain search --headed --config <playwright_config_path>
    node scripts/scout run-tests --arch serverless --domain search --testFiles <spec_path1,spec_path2>
    node scripts/scout run-tests --arch serverless --domain search --testFiles <spec_directory_path>

    On Elastic Cloud Hosted deployment (ECH):
    node scripts/scout run-tests --location cloud --arch stateful --domain classic --config <playwright_config_path>

    On Elastic Cloud projects (MKI):
    node scripts/scout run-tests --location cloud --arch serverless --domain search --config <playwright_config_path>
  `,
  flags: TEST_FLAG_OPTIONS,
  run: async ({ flagsReader, log }) => {
    await runScoutPlaywrightConfig(flagsReader, log);
  },
};
