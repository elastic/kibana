#!/usr/bin/env node

const yargs = require('yargs');
const initSteps = require('./steps');
const { getConfig } = require('../lib/configs');

const config = getConfig();
const isBool = value => typeof value === 'boolean';
const args = yargs
  .usage('$0 [args]')
  .option('multiple', {
    default: undefined,
    description: 'Select multiple versions and/or commits',
    type: 'boolean'
  })
  .option('multiple-commits', {
    default: isBool(config.multipleCommits) ? config.multipleCommits : false,
    description: 'Backport multiple commits',
    type: 'boolean'
  })
  .option('multiple-versions', {
    default: isBool(config.multipleVersions) ? config.multipleVersions : true,
    description: 'Backport to multiple version',
    type: 'boolean'
  })
  .option('sha', {
    description: 'Supply a commit sha to backport',
    type: 'string'
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

const options = Object.assign(
  {},
  config,
  args,
  {
    multipleVersions: isBool(args.multiple)
      ? args.multiple
      : args.multipleVersions,
    multipleCommits: isBool(args.multiple)
      ? args.multiple
      : args.multipleCommits
  },
  { cwd: process.cwd() }
);

initSteps(options);
