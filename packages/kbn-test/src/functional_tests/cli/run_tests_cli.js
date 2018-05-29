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

import dedent from 'dedent';
import getopts from 'getopts';
import { createToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';
import { runTests } from '../../';

/**
 * Run servers and tests for each config
 * Only cares about --config option. Other options
 * are passed directly to functional_test_runner, such as
 * --bail, --verbose, etc.
 * @param {string[]} defaultConfigPaths  Array of paths to configs to use
 *                                       if no config option is passed
 */
export async function runTestsCli(defaultConfigPaths) {
  const { configs, help, bail, log, installDir } = processArgs(
    defaultConfigPaths
  );

  if (help) return displayHelp();

  if (!configs || configs.length === 0) {
    log.error(
      `Run Tests requires at least one path to a config. Leave blank to use defaults.`
    );
    process.exit(9);
  }

  try {
    await runTests(configs, { bail, log, installDir });
  } catch (err) {
    log.error('FATAL ERROR');
    log.error(err);
    process.exit(1);
  }
}

function processArgs(defaultConfigPaths) {
  // If no args are passed, use {}
  const options = getopts(process.argv.slice(2)) || {};

  // If --config is passed without paths, it's "true", so use default
  const configs =
    typeof options.config === 'string' || Array.isArray(options.config)
      ? [].concat(options.config)
      : defaultConfigPaths;

  const log = createToolingLog(pickLevelFromFlags(options));
  log.pipe(process.stdout);

  return {
    configs,
    log,
    help: options.help,
    bail: options.bail,
    installDir: options['kibana-install-dir'],
    rest: options._,
  };
}

function displayHelp() {
  console.log(
    dedent(`
    Run Functional Tests

    Usage:  node scripts/functional_tests [options]

    --config      Option to pass in a config
                  Can pass in multiple configs with
                  --config file1 --config file2 --config file3
    --kibana-install-dir
                  Run Kibana from an existing install directory
                  Default: run from source
    --bail        Stop the test run at the first failure
    --help        Display this menu and exit

    Log level options:

    --verbose
    --debug
    --quiet       Log errors
    --silent
    `)
  );
}
