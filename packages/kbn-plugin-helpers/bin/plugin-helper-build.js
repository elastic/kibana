#!/usr/bin/env node

var pkg = require('../package.json');
var program = require('commander');
var help = require('../help');
var task = require('../tasks/build');

program
  .version(pkg.version)
  .description('Build a distributable archive')
  .on('--help', help('build'))
  .parse(process.argv);


task();
