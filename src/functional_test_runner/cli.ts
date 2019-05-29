/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';

import { run } from '../dev/run';
import { FunctionalTestRunner } from './functional_test_runner';

run(
  async ({ flags, log }) => {
    const resolveConfigPath = (v: string) => resolve(process.cwd(), v);
    const toArray = (v: string | string[]) => ([] as string[]).concat(v || []);

    const functionalTestRunner = new FunctionalTestRunner(
      log,
      resolveConfigPath(flags.config as string),
      {
        mochaOpts: {
          bail: flags.bail,
          grep: flags.grep || undefined,
          invert: flags.invert,
        },
        suiteTags: {
          include: toArray(flags['include-tag'] as string | string[]),
          exclude: toArray(flags['exclude-tag'] as string | string[]),
        },
        updateBaselines: flags.updateBaselines,
        excludeTestFiles: flags.exclude || undefined,
      }
    );

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

    process.on('unhandledRejection', err => teardown(err));
    process.on('SIGTERM', () => teardown());
    process.on('SIGINT', () => teardown());

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
    flags: {
      string: ['config', 'grep', 'exclude', 'include-tag', 'exclude-tag'],
      boolean: ['bail', 'invert', 'test-stats', 'updateBaselines'],
      default: {
        config: 'test/functional/config.js',
        debug: true,
      },
      help: `
        --config=path      path to a config file
        --bail             stop tests after the first failure
        --grep <pattern>   pattern used to select which tests to run
        --invert           invert grep to exclude tests
        --exclude=file     path to a test file that should not be loaded
        --include-tag=tag  a tag to be included, pass multiple times for multiple tags
        --exclude-tag=tag  a tag to be excluded, pass multiple times for multiple tags
        --test-stats       print the number of tests (included and excluded) to STDERR
        --updateBaselines  replace baseline screenshots with whatever is generated from the test
      `,
    },
  }
);
