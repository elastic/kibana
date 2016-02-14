#!/usr/bin/env node

require('../lib/command')('test:browser', function (program) {

  program
  .description('Run the browser tests in a real web browser');

});
