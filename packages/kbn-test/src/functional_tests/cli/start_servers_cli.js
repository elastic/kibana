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

import chalk from 'chalk';
import dedent from 'dedent';
import getopts from 'getopts';
import { createToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';
import { startServers } from '../../';

/**
 * Start servers
 * @param {string} configPath path to config
 */
export async function startServersCli(defaultConfigPath) {
  const { config, log, help, installDir } = processArgv(defaultConfigPath);

  if (help) return displayHelp();

  if (!config) {
    log.error(
      `Start Servers requires one path to a config. Leave blank to use default.`
    );
    process.exit(1);
  }

  try {
    await startServers(config, { log, installDir });
  } catch (err) {
    log.error('FATAL ERROR');
    log.error(err);
    process.exit(1);
  }
}

function processArgv(defaultConfigPath) {
  const options = getopts(process.argv.slice(2)) || {};

  if (Array.isArray(options.config)) {
    console.log(
      chalk.red(
        `Starting servers requires a single config path. Multiple were passed.`
      )
    );
    process.exit(9);
  }

  const config =
    typeof options.config === 'string' ? options.config : defaultConfigPath;

  const log = createToolingLog(pickLevelFromFlags(options));
  log.pipe(process.stdout);

  return {
    config,
    log,
    installDir: options.kibanaInstallDir,
    help: options.help,
    rest: options._,
  };
}

function displayHelp() {
  console.log(
    dedent(`
    Start Functional Test Servers

    Usage:  node scripts/functional_tests_server [options]

    --config      Option to pass in a config
    --kibana-install-dir
                  Run Kibana from an existing install directory
                  Default: run from source
    --help        Display this menu and exit

    Log level options:

    --verbose
    --debug
    --quiet       Log errors
    --silent
    `)
  );
}
