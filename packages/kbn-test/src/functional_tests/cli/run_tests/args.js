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
import { createToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';

const options = {
  help: { desc: 'Display this menu and exit.' },
  config: {
    arg: '<file>',
    desc: 'Pass in a config. Can pass in multiple configs.',
  },
  esFrom: {
    arg: '<snapshot|source>',
    choices: ['snapshot', 'source'],
    desc: 'Build Elasticsearch from source or run from snapshot.',
    default: 'snapshot',
  },
  'kibana-install-dir': {
    arg: '<dir>',
    desc: 'Run Kibana from existing install directory instead of from source.',
  },
  bail: { desc: 'Stop the test run at the first failure.' },
  grep: {
    arg: '<pattern>',
    desc: 'Pattern to select which tests to run.',
  },
  updateBaselines: {
    desc:
      'Replace baseline screenshots with whatever is generated from the test.',
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
        default: option.default ? `Default: ${option.default}` : '',
      };
    })
    .map(option => {
      return `--${option.usage.padEnd(28)} ${option.desc} ${option.default}`;
    })
    .join(`\n      `);

  return dedent(`
    Run Functional Tests

    Usage:
      node scripts/functional_tests --help
      node scripts/functional_tests [--config <file1> [--config <file2> ...]]
      node scripts/functional_tests [options] [-- --<other args>]

    Options:
      ${helpOptions}
    `);
}

export function processOptions(userOptions, defaultConfigPaths) {
  validateOptions(userOptions);

  let configs;
  if (userOptions.config) {
    configs = [].concat(userOptions.config);
  } else {
    if (!defaultConfigPaths || defaultConfigPaths.length === 0) {
      throw new Error(`functional_tests: config is required`);
    } else {
      configs = defaultConfigPaths;
    }
  }

  function createLogger() {
    const log = createToolingLog(pickLevelFromFlags(userOptions));
    log.pipe(process.stdout);
    return log;
  }

  return {
    ...userOptions,
    configs,
    createLogger,
    extraKbnOpts: userOptions._,
  };
}

function validateOptions(userOptions) {
  Object.entries(userOptions).forEach(([key, val]) => {
    if (key === '_') return;

    // Validate flags passed
    if (options[key] === undefined) {
      throw new Error(`functional_tests: invalid option [${key}]`);
    }

    if (
      // Validate boolean flags
      (!options[key].arg && typeof val !== 'boolean') ||
      // Validate string/array flags
      (options[key].arg && typeof val !== 'string' && !Array.isArray(val)) ||
      // Validate enum flags
      (options[key].choices && !options[key].choices.includes(val))
    ) {
      throw new Error(
        `functional_tests: invalid argument [${val}] to option [${key}]`
      );
    }
  });
}
