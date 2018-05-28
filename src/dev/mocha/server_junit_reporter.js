// when the reporter is loaded by mocha in child process it might be before setup_node_env
require('../../setup_node_env');

module.exports = require('./auto_junit_reporter').createAutoJunitReporter({
  reportName: 'Server Mocha Tests',
});
