const resolve = require('path').resolve;
const statSync = require('fs').statSync;
const configFile = require('./config_file');

module.exports = function (root) {
  if (!root) root = process.cwd();

  const pkg = require(resolve(root, 'package.json'));
  const config = configFile(root);

  const buildSourcePatterns = [
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
    const stat = statSync(path);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}