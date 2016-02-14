var resolve = require('path').resolve;

module.exports = function () {
  var root = process.cwd();
  var pkg = require(resolve(root, 'package.json'));

  return {
    root: root,
    kibanaRoot: resolve(root, '../kibana'),
    id: pkg.name,
    pkg: pkg,
    version: pkg.version,
    config: (pkg.config && pkg.config.kibanaPluginHelpers) || {}
  };
};
