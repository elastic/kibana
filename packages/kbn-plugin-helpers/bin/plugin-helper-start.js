#!/usr/bin/env node

var program = require('commander');

var pkg = require('../package.json');
var help = require('../help');
var task = require('../tasks/start');

program
  .version(pkg.version)
  .description('Start kibana and have it include this plugin')
  .on('--help', help('start'))
  .parse(process.argv);


task();
