const { resolve } = require('path');

const { debug } = require('./debug');

const DEFAULT_PLUGIN_PATH = '../../kibana';

/*
 * Resolves the path to Kibana, either from default setting or config
 */
exports.getKibanaPath = function(config, projectRoot) {
  const inConfig = config != null && config.kibanaPath;

  // We only allow `.` in the config as we need it for Kibana itself
  if (inConfig && config.kibanaPath !== '.') {
    throw new Error(
      'The `kibanaPath` option has been removed from `eslint-import-resolver-kibana`. ' +
        'During development your plugin must live in `../kibana-extra/{pluginName}` ' +
        'relative to the Kibana folder to work with this package.'
    );
  }

  const kibanaPath = inConfig
    ? resolve(projectRoot, config.kibanaPath)
    : resolve(projectRoot, DEFAULT_PLUGIN_PATH);

  debug(`Resolved Kibana path: ${kibanaPath}`);
  return kibanaPath;
};
