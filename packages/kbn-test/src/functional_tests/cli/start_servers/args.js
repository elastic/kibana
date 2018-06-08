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
import { createToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';

const options = {
  help: { desc: 'Display this menu and exit.' },
  config: {
    arg: '<file>',
    desc: 'Pass in a config',
  },
  'es-from': {
    arg: '<snapshot|source>',
    choices: ['snapshot', 'source'],
    desc: 'Build Elasticsearch from source or run from snapshot.',
    default: 'snapshot',
  },
  'kibana-install-dir': {
    arg: '<dir>',
    desc: 'Run Kibana from existing install directory instead of from source.',
  },
  verbose: { desc: 'Log everything.' },
  debug: { desc: 'Run in debug mode.' },
  quiet: { desc: 'Only log errors.' },
  silent: { desc: 'Log nothing.' },
};

export function displayHelp() {
  const helpOptions = Object.keys(options)
    .filter(opt => opt !== '_')
    .map(name => {
      return {
        ...options[name],
        usage: `${name} ${options[name].arg || ''}`,
        default: options[name].default
          ? `Default: ${options[name].default}`
          : '',
      };
    })
    .map(option => {
      return `--${option.usage.padEnd(28)} ${option.desc} ${option.default}`;
    })
    .join(`\n      `);

  console.log(
    dedent(`
    Run Functional Tests

    Usage:
      node scripts/functional_tests_server --help
      node scripts/functional_tests_server [--config <file>]
      node scripts/functional_tests_server [options] [-- --<other args>]

    Options:
      ${helpOptions}
    `)
  );
}

export function processOptions(userOptions, defaultConfigPath) {
  validateOptions(userOptions);

  const config = userOptions.config || defaultConfigPath;

  if (!config) {
    console.log(chalk.red(`functional_tests_server: config is required`));
    throw new Error();
  }

  const log = createToolingLog(pickLevelFromFlags(userOptions));
  log.pipe(process.stdout);

  return {
    ...userOptions,
    config,
    log,
    extraKbnOpts: userOptions._,
  };
}

function validateOptions(userOptions) {
  Object.entries(userOptions).forEach(([key, val]) => {
    if (key === '_') return;

    // Validate flags passed
    if (options[key] === undefined) {
      console.log(
        chalk.red(`functional_tests_server: invalid option [${key}]`)
      );
      throw new Error();
    }

    if (
      // Validate boolean flags
      (!options[key].arg && typeof val !== 'boolean') ||
      // Validate string/array flags
      (options[key].arg && typeof val !== 'string' && !Array.isArray(val)) ||
      // Validate enum flags
      (options[key].choices && !options[key].choices.includes(val))
    ) {
      console.log(
        chalk.red(
          `functional_tests_server: invalid argument [${val}] to option [${key}]`
        )
      );
      throw new Error();
    }
  });
}
