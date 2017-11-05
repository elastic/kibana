#!/usr/bin/env node

const yargs = require('yargs');
const initSteps = require('./steps');
const { getConfig } = require('../lib/configs');

const config = getConfig();
const isBool = value => typeof value === 'boolean';
const args = yargs
  .usage('$0 [args]')
  .option('multiple', {
    default: isBool(config.multiple) ? config.multiple : true,
    description: 'Backport to multiple versions',
    type: 'boolean'
  })
  .option('own', {
    default: isBool(config.own) ? config.own : true,
    description: 'Only show own commits',
    type: 'boolean'
  })
  .option('config', {
    description: 'Show configuration file',
    type: 'boolean'
  })
  .alias('v', 'version')
  .version()
  .help().argv;

if (args.config) {
  console.log(JSON.stringify(config, null, 4));
  return;
}

const options = Object.assign({}, args, { cwd: process.cwd() });

initSteps(config, options);
