#!/usr/bin/env node

const yargs = require('yargs');
const { init } = require('./cli');
const { getConfig } = require('./configs');
const config = getConfig();

const args = yargs
  .usage('$0 [args]')
  .option('multiple', {
    default: false,
    description: 'Backport to multiple versions',
    type: 'boolean'
  })
  .option('own', {
    default: true,
    description: 'Only show own commits',
    type: 'boolean'
  })
  .option('config', {
    description: 'Show configuration file',
    type: 'boolean'
  })
  .version()
  .help().argv;

if (args.config) {
  console.log(JSON.stringify(config, null, 4));
  return;
}

init(config, {
  ...args,
  cwd: process.cwd()
});
