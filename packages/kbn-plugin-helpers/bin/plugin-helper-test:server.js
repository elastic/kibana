#!/usr/bin/env node

require('../lib/command')('test:server', function (program) {

  program
  .description('Run the server tests using mocha');

});
