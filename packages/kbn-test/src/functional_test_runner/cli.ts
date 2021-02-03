/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { inspect } from 'util';

import { run, createFlagError, Flags } from '@kbn/dev-utils';
import exitHook from 'exit-hook';

import { FunctionalTestRunner } from './functional_test_runner';

const makeAbsolutePath = (v: string) => resolve(process.cwd(), v);
const toArray = (v: string | string[]) => ([] as string[]).concat(v || []);
const parseInstallDir = (flags: Flags) => {
  const flag = flags['kibana-install-dir'];

  if (typeof flag !== 'string' && flag !== undefined) {
    throw createFlagError('--kibana-install-dir must be a string or not defined');
  }

  return flag ? makeAbsolutePath(flag) : undefined;
};

export function runFtrCli() {
  run(
    async ({ flags, log }) => {
      const functionalTestRunner = new FunctionalTestRunner(
        log,
        makeAbsolutePath(flags.config as string),
        {
          mochaOpts: {
            bail: flags.bail,
            grep: flags.grep || undefined,
            invert: flags.invert,
          },
          kbnTestServer: {
            installDir: parseInstallDir(flags),
          },
          suiteFiles: {
            include: toArray(flags.include as string | string[]).map(makeAbsolutePath),
            exclude: toArray(flags.exclude as string | string[]).map(makeAbsolutePath),
          },
          suiteTags: {
            include: toArray(flags['include-tag'] as string | string[]),
            exclude: toArray(flags['exclude-tag'] as string | string[]),
          },
          updateBaselines: flags.updateBaselines || flags.u,
          updateSnapshots: flags.updateSnapshots || flags.u,
        }
      );

      if (flags.throttle) {
        process.env.TEST_THROTTLE_NETWORK = '1';
      }

      if (flags.headless) {
        process.env.TEST_BROWSER_HEADLESS = '1';
      }

      let teardownRun = false;
      const teardown = async (err?: Error) => {
        if (teardownRun) return;

        teardownRun = true;
        if (err) {
          log.indent(-log.indent());
          log.error(err);
          process.exitCode = 1;
        }

        try {
          await functionalTestRunner.close();
        } finally {
          process.exit();
        }
      };

      process.on('unhandledRejection', (err) =>
        teardown(
          err instanceof Error ? err : new Error(`non-Error type rejection value: ${inspect(err)}`)
        )
      );
      exitHook(teardown);

      try {
        if (flags['test-stats']) {
          process.stderr.write(
            JSON.stringify(await functionalTestRunner.getTestStats(), null, 2) + '\n'
          );
        } else {
          const failureCount = await functionalTestRunner.run();
          process.exitCode = failureCount ? 1 : 0;
        }
      } catch (err) {
        await teardown(err);
      } finally {
        await teardown();
      }
    },
    {
      log: {
        defaultLevel: 'debug',
      },
      flags: {
        string: [
          'config',
          'grep',
          'include',
          'exclude',
          'include-tag',
          'exclude-tag',
          'kibana-install-dir',
        ],
        boolean: [
          'bail',
          'invert',
          'test-stats',
          'updateBaselines',
          'updateSnapshots',
          'u',
          'throttle',
          'headless',
        ],
        default: {
          config: 'test/functional/config.js',
        },
        help: `
          --config=path      path to a config file
          --bail             stop tests after the first failure
          --grep <pattern>   pattern used to select which tests to run
          --invert           invert grep to exclude tests
          --include=file     a test file to be included, pass multiple times for multiple files
          --exclude=file     a test file to be excluded, pass multiple times for multiple files
          --include-tag=tag  a tag to be included, pass multiple times for multiple tags. Only
                               suites which have one of the passed include-tag tags will be executed.
                               When combined with the --exclude-tag flag both conditions must be met
                               for a suite to run.
          --exclude-tag=tag  a tag to be excluded, pass multiple times for multiple tags. Any suite
                               which has any of the exclude-tags will be excluded. When combined with
                               the --include-tag flag both conditions must be met for a suite to run.
          --test-stats       print the number of tests (included and excluded) to STDERR
          --updateBaselines  replace baseline screenshots with whatever is generated from the test
          --updateSnapshots  replace inline and file snapshots with whatever is generated from the test
          -u                 replace both baseline screenshots and snapshots
          --kibana-install-dir  directory where the Kibana install being tested resides
          --throttle         enable network throttling in Chrome browser
          --headless         run browser in headless mode
        `,
      },
    }
  );
}
