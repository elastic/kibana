var resolve = require('path').resolve;
var statSync = require('fs').statSync;
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

  // add shrinkwrap and lock files, if they exist
  ['npm-shrinkwrap.json', 'yarn.lock']
    .forEach(function (file) {
      if (fileExists(resolve(root, file))) {
        buildSourcePatterns.push(file);
      }
    });

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

function fileExists(path) {
  try {
    var stat = statSync(path);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}