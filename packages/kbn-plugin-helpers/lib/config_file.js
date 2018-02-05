const resolve = require('path').resolve;
const readFileSync = require('fs').readFileSync;

const configFiles = [ '.kibana-plugin-helpers.json', '.kibana-plugin-helpers.dev.json' ];
const configCache = {};
const KIBANA_ROOT_OVERRIDE = process.env.KIBANA_ROOT ? resolve(process.env.KIBANA_ROOT) : null;

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

  // use resolve to ensure correct resolution of paths
  const { kibanaRoot, includePlugins } = config;
  if (kibanaRoot) config.kibanaRoot = resolve(root, kibanaRoot);
  if (includePlugins) config.includePlugins = includePlugins.map(path => resolve(root, path));

  // allow env setting to override kibana root from config
  if (KIBANA_ROOT_OVERRIDE) config.kibanaRoot = KIBANA_ROOT_OVERRIDE;

  return config;
};
