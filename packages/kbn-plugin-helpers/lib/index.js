const run = require('./run');
const utils = require('./utils');

module.exports = function () {
  console.error(
    'running tasks with the default export of @kbn/plugin-helpers is deprecated.' +
    'use `require(\'@kbn/plugin-helpers\').run()` instead'
  );

  return run.apply(this, arguments);
};

Object.assign(module.exports, { run: run }, utils);