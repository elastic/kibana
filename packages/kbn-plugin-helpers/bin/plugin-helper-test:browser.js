#!/usr/bin/env node

var pkg = require('../package.json');
var program = require('commander');
var help = require('../help');
var task = require('../tasks/test:browser');

program
  .version(pkg.version)
  .description('Run the browser tests in a real web browser')
  .on('--help', help('test:browser'))
  .parse(process.argv);


task(program);
