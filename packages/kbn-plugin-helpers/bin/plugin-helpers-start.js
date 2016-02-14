#!/usr/bin/env node

require('../lib/command')('start', function (program) {

  program
  .description('Start kibana and have it include this plugin');

});
