#!/usr/bin/env node

const yargs = require('yargs');
const initSteps = require('./steps');
const { getCombinedConfig } = require('../lib/configs');
const { INVALID_CONFIG } = require('../lib/constants');
const logger = require('../lib/logger');

const args = yargs
  .usage('$0 [args]')
  .option('multiple', {
    default: undefined,
    description: 'Select multiple branches and/or commits',
    type: 'boolean'
  })
  .option('multiple-commits', {
    default: undefined,
    description: 'Backport multiple commits',
    type: 'boolean'
  })
  .option('multiple-branches', {
    default: undefined,
    description: 'Backport to multiple branches',
    type: 'boolean'
  })
  .option('own', {
    default: undefined,
    description: 'Only show own commits',
    type: 'boolean'
  })
  .option('show-config', {
    description: 'Show config settings',
    type: 'boolean'
  })
  .option('sha', {
    description: 'Commit sha to backport',
    type: 'string'
  })
  .alias('v', 'version')
  .version()
  .help().argv;

getCombinedConfig()
  .catch(e => {
    logger.error(e.code === INVALID_CONFIG ? e.message : e);
    process.exit(1);
  })
  .then(config => {
    if (args.showConfig) {
      logger.log(JSON.stringify(config, null, 4));
      process.exit(0);
    }

    const options = Object.assign(
      {
        multipleBranches: true,
        multipleCommits: false,
        own: true
      },
      config,
      removeUndefined(args),
      removeUndefined({
        multipleBranches: args.multiple,
        multipleCommits: args.multiple
      })
    );

    return initSteps(options);
  });

function removeUndefined(obj = {}) {
  return Object.keys(obj).reduce((acc, k) => {
    if (obj[k] !== undefined) {
      acc[k] = obj[k];
    }
    return acc;
  }, {});
}
