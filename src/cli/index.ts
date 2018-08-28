#!/usr/bin/env node

import yargs from 'yargs';
import flatten from 'lodash.flatten';

import { initSteps } from './steps';
import { getCombinedConfig, validateOptions } from '../lib/configs';
import * as logger from '../lib/logger';
import { CombinedConfig } from '../types/types';

async function getConfig() {
  try {
    return await getCombinedConfig();
  } catch (e) {
    switch (e.name) {
      case 'HandledError':
        logger.error(e.message);
        break;
      default:
        logger.error(e);
    }

    return process.exit(1);
  }
}

function getOptions(config: CombinedConfig, cliArgs: yargs.Arguments) {
  try {
    return validateOptions({
      ...config,
      branches: flattenBranches(cliArgs.branch),
      sha: cliArgs.sha,
      all: cliArgs.all,
      multiple: cliArgs.multiple,
      multipleBranches: cliArgs.multipleBranches || cliArgs.multiple,
      multipleCommits: cliArgs.multipleCommits || cliArgs.multiple,
      upstream: cliArgs.upstream
    });
  } catch (e) {
    console.error(e.message);
    return process.exit(1);
  }
}

async function initYargs() {
  const config = await getConfig();
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

  const options = getOptions(config, cliArgs);

  if (cliArgs.showConfig) {
    logger.log(JSON.stringify(options, null, 4));
    process.exit(0);
  }

  return initSteps(options);
}

function flattenBranches(branches: string[]) {
  return flatten(branches.map(b => b.toString().split(','))).filter(b => !!b);
}

initYargs();
