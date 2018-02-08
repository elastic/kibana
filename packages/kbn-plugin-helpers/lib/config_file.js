const resolve = require('path').resolve;
const readFileSync = require('fs').readFileSync;

const configFiles = [ '.kibana-plugin-helpers.json', '.kibana-plugin-helpers.dev.json' ];
const configCache = {};

module.exports = function (root) {
  if (!root) root = process.cwd();

  if (configCache[root]) {
    return configCache[root];
  }

  // config files to read from, in the order they are merged together
  let config = configCache[root] = {};

  configFiles.forEach(function (configFile) {
    try {
      const content = JSON.parse(readFileSync(resolve(root, configFile)));
      config = Object.assign(config, content);
    } catch (e) {
      // rethrow error unless it's complaining about file not existing
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  });

  const deprecationMsg = 'has been removed from `@elastic/plugin-helpers`. ' +
    'During development your plugin must be located in `../kibana-extra/{pluginName}` ' +
    'relative to the Kibana directory to work with this package.\n';

  if (config.kibanaRoot) {
    throw new Error(
      'The `kibanaRoot` config option ' + deprecationMsg
    );
  }
  if (process.env.KIBANA_ROOT) {
    throw new Error(
      'The `KIBANA_ROOT` environment variable ' + deprecationMsg
    );
  }

  // use resolve to ensure correct resolution of paths
  const { includePlugins } = config;
  if (includePlugins) config.includePlugins = includePlugins.map(path => resolve(root, path));

  return config;
};
