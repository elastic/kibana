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

import dedent from 'dedent';
import { ToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';

const options = {
  help: { desc: 'Display this menu and exit.' },
  config: {
    arg: '<file>',
    desc: 'Pass in a config',
  },
  esFrom: {
    arg: '<snapshot|source|path>',
    desc: 'Build Elasticsearch from source, snapshot or path to existing install dir.',
    defaultHelp: 'Default: $TEST_ES_FROM or snapshot',
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
    .filter(name => name !== '_')
    .map(name => {
      const option = options[name];
      return {
        ...option,
        usage: `${name} ${option.arg || ''}`,
        default: option.defaultHelp || '',
      };
    })
    .map(option => {
      return `--${option.usage.padEnd(30)} ${option.desc} ${option.default}`;
    })
    .join(`\n      `);

  return dedent(`
    Start Functional Test Servers

    Usage:
      node scripts/functional_tests_server --help
      node scripts/functional_tests_server [--config <file>]
      node scripts/functional_tests_server [options] [-- --<other args>]

    Options:
      ${helpOptions}
    `);
}

export function processOptions(userOptions, defaultConfigPath) {
  validateOptions(userOptions);

  const config = userOptions.config || defaultConfigPath;

  if (!config) {
    throw new Error(`functional_tests_server: config is required`);
  }

  if (!userOptions.esFrom) {
    userOptions.esFrom = process.env.TEST_ES_FROM || 'snapshot';
  }

  if (userOptions['kibana-install-dir']) {
    userOptions.installDir = userOptions['kibana-install-dir'];
    delete userOptions['kibana-install-dir'];
  }

  function createLogger() {
    return new ToolingLog({
      level: pickLevelFromFlags(userOptions),
      writeTo: process.stdout,
    });
  }

  return {
    ...userOptions,
    config: resolve(config),
    createLogger,
    extraKbnOpts: userOptions._,
  };
}

function validateOptions(userOptions) {
  Object.entries(userOptions).forEach(([key, val]) => {
    if (key === '_') return;

    // Validate flags passed
    if (options[key] === undefined) {
      throw new Error(`functional_tests_server: invalid option [${key}]`);
    }

    if (
      // Validate boolean flags
      (!options[key].arg && typeof val !== 'boolean') ||
      // Validate string/array flags
      (options[key].arg && typeof val !== 'string' && !Array.isArray(val)) ||
      // Validate enum flags
      (options[key].choices && !options[key].choices.includes(val))
    ) {
      throw new Error(`functional_tests_server: invalid argument [${val}] to option [${key}]`);
    }
  });
}
