#!/usr/bin/env node

require('../lib/command')('build', function (program) {

  program
  .description('Build a distributable archive');

});
