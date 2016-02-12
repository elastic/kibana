#!/usr/bin/env node

var pkg = require('../package.json');
var program = require('commander');

program
  .version(pkg.version)
  .command('start', 'start the server')
  .command('test:browser', 'run the browser tests')
  .command('test:server', 'run the server tests')
  .command('build', 'build a distributable archive')
  .parse(process.argv);
