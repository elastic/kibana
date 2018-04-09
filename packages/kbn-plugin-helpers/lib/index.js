const run = require('./run');
const utils = require('./utils');
const migrations = require('./migrations');

module.exports = function () {
  console.error(
    'running tasks with the default export of @kbn/plugin-helpers is deprecated.' +
    'use `require(\'@kbn/plugin-helpers\').run()` instead'
  );

  return run.apply(this, arguments);
};

Object.assign(module.exports, { run: run, migrations: migrations }, utils);
