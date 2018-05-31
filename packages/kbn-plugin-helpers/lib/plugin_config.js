const resolve = require('path').resolve;
const readFileSync = require('fs').readFileSync;
const configFile = require('./config_file');

module.exports = function (root) {
  if (!root) root = process.cwd();

  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json')));
  const config = configFile(root);

  const buildSourcePatterns = [
    'yarn.lock',
    'package.json',
    'index.js',
    '{lib,public,server,webpackShims,translations}/**/*',
  ];

  return Object.assign({
    root: root,
    kibanaRoot: pkg.name === 'x-pack'
      ? resolve(root, '..')
      : resolve(root, '../../kibana'),
    serverTestPatterns: ['server/**/__tests__/**/*.js'],
    buildSourcePatterns: buildSourcePatterns,
    skipInstallDependencies: false,
    id: pkg.name,
    pkg: pkg,
    version: pkg.version,
  }, config);
};
