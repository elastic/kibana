#!/usr/bin/env node

var program = require('commander');

var pkg = require('../package.json');
var help = require('../help');
var task = require('../tasks/test:server');

program
  .version(pkg.version)
  .description('Run the server tests using mocha')
  .on('--help', help('test:server'))
  .parse(process.argv);

task();
