#!/usr/bin/env node

const yargs = require('yargs');
const { init } = require('./cli');
const { getConfig } = require('./configs');
const { CONFIG_FILE_PERMISSION_ERROR } = require('./constants');

let config;
try {
  config = getConfig();
} catch (error) {
  if (error.code === CONFIG_FILE_PERMISSION_ERROR) {
    console.log(error.message);
    process.exit(1);
  }
}

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

init(config, options);
