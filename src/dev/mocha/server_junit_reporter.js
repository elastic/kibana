// when the reporter is loaded by mocha in child process it might be before babel-register
require('../../babel-register');

module.exports = require('./auto_junit_reporter').createAutoJunitReporter({
  reportName: 'Server Mocha Tests',
});
