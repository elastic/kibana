const resolve = require('path').resolve;

const pluginConfig = require('./plugin_config');

function babelRegister() {
  const plugin = pluginConfig();
  require(resolve(plugin.kibanaRoot, 'src/optimize/babel/register'));
}

function resolveKibanaPath(path) {
  const plugin = pluginConfig();
  return resolve(plugin.kibanaRoot, path);
}

function createToolingLog(level) {
  return require(resolveKibanaPath('src/utils')).createToolingLog(level);
}

function readFtrConfigFile(log, path, settingOverrides) {
  return require(resolveKibanaPath('src/functional_test_runner')).readConfigFile(log, path, settingOverrides);
}

module.exports = {
  babelRegister: babelRegister,
  resolveKibanaPath: resolveKibanaPath,
  createToolingLog: createToolingLog,
  readFtrConfigFile: readFtrConfigFile,
};