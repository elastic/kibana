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

import { Command } from 'commander';

import { createToolingLog } from '@kbn/dev-utils';
import { createFunctionalTestRunner } from './functional_test_runner';

const cmd = new Command('node scripts/functional_test_runner');
const resolveConfigPath = v => resolve(process.cwd(), v);
const defaultConfigPath = resolveConfigPath('test/functional/config.js');

cmd
  .option('--config [path]', 'Path to a config file', resolveConfigPath, defaultConfigPath)
  .option('--bail', 'stop tests after the first failure', false)
  .option('--grep <pattern>', 'pattern used to select which tests to run')
  .option('--invert', 'invert grep to exclude tests', false)
  .option('--verbose', 'Log everything', false)
  .option('--quiet', 'Only log errors', false)
  .option('--silent', 'Log nothing', false)
  .option('--updateBaselines', 'Replace baseline screenshots with whatever is generated from the test', false)
  .option('--debug', 'Run in debug mode', false)
  .parse(process.argv);

let logLevel = 'info';
if (cmd.silent) logLevel = 'silent';
if (cmd.quiet) logLevel = 'error';
if (cmd.debug) logLevel = 'debug';
if (cmd.verbose) logLevel = 'verbose';

const log = createToolingLog(logLevel);
log.pipe(process.stdout);

const functionalTestRunner = createFunctionalTestRunner({
  log,
  configFile: cmd.config,
  configOverrides: {
    mochaOpts: {
      bail: cmd.bail,
      grep: cmd.grep,
      invert: cmd.invert,
    },
    updateBaselines: cmd.updateBaselines
  }
});

async function run() {
  try {
    const failureCount = await functionalTestRunner.run();
    process.exitCode = failureCount ? 1 : 0;
  } catch (err) {
    await teardown(err);
  } finally {
    await teardown();
  }
}

let teardownRun = false;
async function teardown(err) {
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
}

process.on('unhandledRejection', err => teardown(err));
process.on('SIGTERM', () => teardown());
process.on('SIGINT', () => teardown());
run();
