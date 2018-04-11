const webpackResolver = require('eslint-import-resolver-webpack');
const nodeResolver = require('eslint-import-resolver-node');
const getProjectRoot = require('./lib/get_project_root');
const getWebpackConfig = require('./lib/get_webpack_config');

// cache expensive resolution results
let projectRoot;
let webpackConfig;

exports.resolve = function resolveKibanaPath(source, file, config) {
  const settings = config || {};

  // try to resolve with the node resolver first
  const resolvedWithNode = nodeResolver.resolve(source, file, config);
  if (resolvedWithNode && resolvedWithNode.found) {
    return resolvedWithNode;
  }

  // fall back to the webpack resolver
  projectRoot = projectRoot || getProjectRoot(file, settings);
  webpackConfig = webpackConfig || getWebpackConfig(source, projectRoot, settings);
  return webpackResolver.resolve(source, file, {
    config: webpackConfig
  });
};

// use version 2 of the resolver interface, https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#interfaceversion--number
exports.interfaceVersion = 2;
