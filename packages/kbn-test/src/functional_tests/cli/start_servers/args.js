/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import dedent from 'dedent';
import { ToolingLog, pickLevelFromFlags } from '@kbn/tooling-log';

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

  const useDefaultConfig = !userOptions.config;
  const config = useDefaultConfig ? defaultConfigPath : userOptions.config;

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
    useDefaultConfig,
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
