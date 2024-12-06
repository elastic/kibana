/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { initLogsDir } from '@kbn/test';
import { TEST_FLAG_OPTIONS, parseTestFlags, runTests } from '../playwright/runner';

/**
 * Start servers and run the tests
 */
export function runTestsCli() {
  run(
    async ({ flagsReader, log }) => {
      const options = await parseTestFlags(flagsReader);

      if (options.logsDir) {
        initLogsDir(log, options.logsDir);
      }

      await runTests(log, options);
    },
    {
      description: `Run Scout UI Tests`,
      usage: `
      Usage:
        node scripts/scout_test --help
        node scripts/scout_test --stateful --config <playwright_config_path>
        node scripts/scout_test --serverless=es --headed --config <playwright_config_path>
      `,
      flags: TEST_FLAG_OPTIONS,
    }
  );
}
