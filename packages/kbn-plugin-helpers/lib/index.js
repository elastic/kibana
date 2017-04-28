var run = require('./run');
var utils = require('./utils');

module.exports = function () {
  console.error(
    'running tasks with the default export of @elastic/plugin-helpers is deprecated.' +
    'use `require(\'@elastic/plugin-helpers\').run()` instead'
  );

  return run.apply(this, arguments);
};

Object.assign(module.exports, { run: run }, utils);