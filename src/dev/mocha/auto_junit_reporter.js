// WARNING: this file is required directly by mocha, so it isn't transpiled

require('../../babel-register');
const MochaSpecReporter = require('mocha').reporters.spec;
const { MochaJunitReporter } = require('./junit_reporter');

module.exports = function (runner, options) {
  // setup a spec reporter for console output
  new MochaSpecReporter(runner, options);

  // in CI we also setup the Junit reporter
  if (process.env.CI) {
    new MochaJunitReporter(runner, options);
  }
};
