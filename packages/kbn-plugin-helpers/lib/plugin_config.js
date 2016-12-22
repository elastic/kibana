var resolve = require('path').resolve;
var readFileSync = require('fs').readFileSync;
var configFile = require('./config_file');

module.exports = function (root) {
  if (!root) root = process.cwd();

  var pkg = require(resolve(root, 'package.json'));
  var config = configFile(root);

  var buildSourcePatterns = [
    'package.json',
    'index.js',
    '{lib,public,server,webpackShims}/**/*',
  ];

  // add dependency files
  var deps = Object.keys(pkg.dependencies || {});
  if (deps.length === 1) {
    buildSourcePatterns.push(`node_modules/${ deps[0] }/**/*`);
  } else if (deps.length) {
    buildSourcePatterns.push(`node_modules/{${ deps.join(',') }}/**/*`);
  }

  return Object.assign({
    root: root,
    kibanaRoot: resolve(root, '../kibana'),
    serverTestPatterns: ['server/**/__tests__/**/*.js'],
    buildSourcePatterns: buildSourcePatterns,
    id: pkg.name,
    pkg: pkg,
    version: pkg.version,
  }, config);
};
