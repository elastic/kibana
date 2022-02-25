/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import dedent from 'dedent';
import { ToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';
import { EsVersion } from '../../../functional_test_runner';

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
    defaultHelp: 'Default: $TEST_ES_FROM or snapshot',
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
    desc: 'Replace baseline screenshots with whatever is generated from the test.',
  },
  updateSnapshots: {
    desc: 'Replace inline and file snapshots with whatever is generated from the test.',
  },
  u: {
    desc: 'Replace both baseline screenshots and snapshots',
  },
  include: {
    arg: '<file>',
    desc: 'Files that must included to be run, can be included multiple times.',
  },
  exclude: {
    arg: '<file>',
    desc: 'Files that must NOT be included to be run, can be included multiple times.',
  },
  'include-tag': {
    arg: '<tag>',
    desc: 'Tags that suites must include to be run, can be included multiple times.',
  },
  'exclude-tag': {
    arg: '<tag>',
    desc: 'Tags that suites must NOT include to be run, can be included multiple times.',
  },
  'assert-none-excluded': {
    desc: 'Exit with 1/0 based on if any test is excluded with the current set of tags.',
  },
  verbose: { desc: 'Log everything.' },
  debug: { desc: 'Run in debug mode.' },
  quiet: { desc: 'Only log errors.' },
  silent: { desc: 'Log nothing.' },
  'dry-run': { desc: 'Report tests without executing them.' },
};

export function displayHelp() {
  const helpOptions = Object.keys(options)
    .filter((name) => name !== '_')
    .map((name) => {
      const option = options[name];
      return {
        ...option,
        usage: `${name} ${option.arg || ''}`,
        default: option.defaultHelp || '',
      };
    })
    .map((option) => {
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

  if (!userOptions.esFrom) {
    userOptions.esFrom = process.env.TEST_ES_FROM || 'snapshot';
  }

  if (userOptions['kibana-install-dir']) {
    userOptions.installDir = userOptions['kibana-install-dir'];
    delete userOptions['kibana-install-dir'];
  }

  userOptions.suiteFiles = {
    include: [].concat(userOptions.include || []),
    exclude: [].concat(userOptions.exclude || []),
  };
  delete userOptions.include;
  delete userOptions.exclude;

  userOptions.suiteTags = {
    include: [].concat(userOptions['include-tag'] || []),
    exclude: [].concat(userOptions['exclude-tag'] || []),
  };
  delete userOptions['include-tag'];
  delete userOptions['exclude-tag'];

  userOptions.assertNoneExcluded = !!userOptions['assert-none-excluded'];
  delete userOptions['assert-none-excluded'];

  if (userOptions['dry-run']) {
    userOptions.dryRun = userOptions['dry-run'];
    delete userOptions['dry-run'];
  }

  function createLogger() {
    return new ToolingLog({
      level: pickLevelFromFlags(userOptions),
      writeTo: process.stdout,
    });
  }

  return {
    ...userOptions,
    configs: configs.map((c) => resolve(c)),
    createLogger,
    extraKbnOpts: userOptions._,
    esVersion: EsVersion.getDefault(),
  };
}

function validateOptions(userOptions) {
  Object.entries(userOptions).forEach(([key, val]) => {
    if (key === '_' || key === 'suiteTags') {
      return;
    }

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
      throw new Error(`functional_tests: invalid argument [${val}] to option [${key}]`);
    }
  });
}
