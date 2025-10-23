/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';

import dedent from 'dedent';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FLAG_OPTIONS } from '../flags';
import { runTestsParallel } from './run_tests_parallel';

export function runTestsCliParallel() {
  return run(
    async ({ flagsReader, log }) => {
      const configs = flagsReader.requiredArrayOfStrings('config');
      const suppress = flagsReader.boolean('suppress');
      const buffer = flagsReader.boolean('buffer');
      const inherit = flagsReader.boolean('inherit');
      const stats = flagsReader.boolean('stats');

      const installDir = flagsReader.string('kibana-install-dir');
      const bail = flagsReader.boolean('bail');
      const grep = flagsReader.string('grep');
      const debug = flagsReader.boolean('debug');

      let category = flagsReader.string('category');

      if (
        category !== ScoutTestRunConfigCategory.API_TEST &&
        category !== ScoutTestRunConfigCategory.UI_TEST
      ) {
        category = undefined;
      }

      const extraArgs: string[] = [];

      if (installDir) {
        extraArgs.push(`--kibana-install-dir`, installDir);
      }

      if (bail) {
        extraArgs.push(`--bail`);
      }

      if (debug) {
        extraArgs.push('--debug');
      }

      if (grep) {
        extraArgs.push(`--grep="${grep}"`);
      }

      const exitCode = await runTestsParallel(log, configs, {
        extraArgs,
        stdio:
          buffer === true
            ? 'buffer'
            : suppress === true
            ? 'suppress'
            : inherit === true
            ? 'inherit'
            : 'buffer',
        stats,
        category,
      });

      return exitCode;
    },
    {
      description: `Run Functional Tests`,
      usage: `
      Usage:
        node scripts/functional_tests_parallel --help
        node scripts/functional_tests_parallel [--config <file1> [--config <file2> ...]]
        node scripts/functional_tests_parallel [options] [-- --<other args>]
      `,
      flags: {
        ...FLAG_OPTIONS,
        string: [...(FLAG_OPTIONS.string ?? []), 'category'],
        boolean: [
          ...(FLAG_OPTIONS.boolean ?? []).filter((flag) => flag !== 'pause'),
          'suppress',
          'buffer',
          'inherit',
          'stats',
        ],
        help: (FLAG_OPTIONS.help ?? '').concat(
          dedent(`
            --suppress            Suppress logs from configs
            --buffer              Buffer logs from configs (default)
            --inherit             Inherit logs from configs
            --stats               Log stats for each running config every 10s
            --category            Category of tests to run (defaults to all)
            `)
        ),
      },
    }
  );
}
