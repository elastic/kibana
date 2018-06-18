#!/usr/bin/env node

const yargs = require('yargs');
const flatten = require('lodash.flatten');
const initSteps = require('./steps');
const {
  getCombinedConfig,
  validateConfigWithCliArgs
} = require('../lib/configs');
const { ERROR_CODES } = require('../lib/errors');
const logger = require('../lib/logger');

async function initYargs() {
  let config;
  try {
    config = await getCombinedConfig();
  } catch (e) {
    switch (e.code) {
      case ERROR_CODES.INVALID_CONFIG_ERROR_CODE:
      case ERROR_CODES.INVALID_JSON_ERROR_CODE:
        logger.error(e.message);
        break;
      default:
        logger.error(e);
    }

    process.exit(1);
  }

  const cliArgs = yargs
    .usage('$0 [args]')
    .option('multiple', {
      default: config.multiple,
      description: 'Select multiple branches/commits',
      type: 'boolean'
    })
    .option('multiple-commits', {
      default: config.multipleCommits,
      description: 'Backport multiple commits',
      type: 'boolean'
    })
    .option('multiple-branches', {
      default: config.multipleBranches,
      description: 'Backport to multiple branches',
      type: 'boolean'
    })
    .option('all', {
      default: config.all,
      description: 'List all commits',
      type: 'boolean'
    })
    .option('upstream', {
      default: config.upstream,
      description: 'Name of repository',
      type: 'string'
    })
    .option('branch', {
      default: [],
      description: 'Branch to backport',
      type: 'array'
    })
    .option('sha', {
      description: 'Commit sha to backport',
      type: 'string'
    })
    .option('show-config', {
      description: 'Show config settings',
      type: 'boolean'
    })
    .alias('v', 'version')
    .version()
    .help().argv;

  const configWithCliArgs = {
    ...config,
    multiple: cliArgs.multiple,
    multipleCommits: cliArgs.multipleCommits || cliArgs.multiple,
    multipleBranches: cliArgs.multipleBranches || cliArgs.multiple,
    all: cliArgs.all,
    upstream: cliArgs.upstream
  };

  const options = {
    branches: flattenBranches(cliArgs.branch),
    sha: cliArgs.sha
  };

  try {
    validateConfigWithCliArgs(configWithCliArgs, options);
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }

  if (cliArgs.showConfig) {
    logger.log(JSON.stringify(configWithCliArgs, null, 4));
    process.exit(0);
  }

  return initSteps(configWithCliArgs, options);
}

function flattenBranches(branches) {
  return flatten(branches.map(b => b.toString().split(','))).filter(b => !!b);
}

initYargs();
