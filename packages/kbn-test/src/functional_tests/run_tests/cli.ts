/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';

import { initLogsDir } from '../lib/logs_dir';
import { runTests } from './run_tests';
import { parseFlags } from './flags';

export function runTestsCli() {
  run(
    async ({ flags, log }) => {
      const options = parseFlags(flags);

      if (options.logsDir) {
        initLogsDir(log, options.logsDir);
      }

      await runTests(log, options);
    },
    {
      description: `Run Functional Tests`,
      usage: `
        node scripts/functional_tests --help
        node scripts/functional_tests [--config <file1> [--config <file2> ...]]
        node scripts/functional_tests [options] [-- --<other args>]
      `,
      flags: {
        boolean: [
          'bail',
          'logToFile',
          'dry-run',
          'updateBaselines',
          'updateSnapshots',
          'updateAll',
        ],
        string: [
          'config',
          'journey',
          'esFrom',
          'kibana-install-dir',
          'grep',
          'include-tag',
          'exclude-tag',
          'include',
          'exclude',
        ],
        alias: {
          updateAll: 'u',
        },
        help: `
          --config             Define a FTR config that should be executed. Can be specified multiple times
          --journey            Define a Journey that should be executed. Can be specified multiple times
          --esFrom             Build Elasticsearch from source or run from snapshot. Default: $TEST_ES_FROM or "snapshot"
          --include-tag        Tags that suites must include to be run, can be included multiple times
          --exclude-tag        Tags that suites must NOT include to be run, can be included multiple times
          --include            Files that must included to be run, can be included multiple times
          --exclude            Files that must NOT be included to be run, can be included multiple times
          --grep               Pattern to select which tests to run
          --kibana-install-dir Run Kibana from existing install directory instead of from source
          --bail               Stop the test run at the first failure
          --logToFile          Write the log output from Kibana/ES to files instead of to stdout
          --dry-run            Report tests without executing them
          --updateBaselines    Replace baseline screenshots with whatever is generated from the test
          --updateSnapshots    Replace inline and file snapshots with whatever is generated from the test
          --updateAll, -u      Replace both baseline screenshots and snapshots
        `,
      },
    }
  );
}
