const resolve = require('path').resolve;

const pluginConfig = require('./plugin_config');

function babelRegister() {
  const plugin = pluginConfig();

  try {
    // add support for moved babel-register source: https://github.com/elastic/kibana/pull/13973
    require(resolve(plugin.kibanaRoot, 'src/babel-register'));
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      require(resolve(plugin.kibanaRoot, 'src/optimize/babel/register'));
    } else {
      throw error;
    }
  }
}

function resolveKibanaPath(path) {
  const plugin = pluginConfig();
  return resolve(plugin.kibanaRoot, path);
}

function createToolingLog(level) {
  // The tooling log location changed in 6.1.0, see https://github.com/elastic/kibana/pull/14890
  const utils = require(resolveKibanaPath('src/utils'));
  if (utils.createToolingLog) return utils.createToolingLog(level);
  return require(resolveKibanaPath('src/dev')).createToolingLog(level);
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