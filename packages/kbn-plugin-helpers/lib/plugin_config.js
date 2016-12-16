var resolve = require('path').resolve;
var readFileSync = require('fs').readFileSync;

module.exports = function (root) {
  if (!root) root = process.cwd();
  var pkg = require(resolve(root, 'package.json'));
  // config files to read from, in the order they are merged together
  var configFiles = [ '.kibana-plugin-helpers.json', '.kibana-plugin-helpers.dev.json' ];
  var config = {};

  configFiles.forEach(function (configFile) {
    try {
      var content = JSON.parse(readFileSync(resolve(root, configFile)));
      config = Object.assign(config, content);
    } catch (e) {
      // noop
    }
  });

  // if the kibanaRoot is set, use resolve to ensure correct resolution
  if (config.kibanaRoot) config.kibanaRoot = resolve(root, config.kibanaRoot);

  return Object.assign({
    root: root,
    kibanaRoot: resolve(root, '../kibana'),
    serverTestPatterns: ['server/**/__tests__/**/*.js'],
    id: pkg.name,
    pkg: pkg,
    version: pkg.version,
  }, config);
};
