/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { join, dirname, extname } = require('path');

const webpackResolver = require('eslint-import-resolver-webpack');
const nodeResolver = require('eslint-import-resolver-node');

const {
  getKibanaPath,
  getProjectRoot,
  getWebpackConfig,
  isFile,
  getIsPathRequest,
  resolveWebpackAlias,
} = require('./lib');

// cache context, it shouldn't change
let context;
function initContext(file, config) {
  if (context) {
    return context;
  }

  const projectRoot = getProjectRoot(file, config);
  const kibanaPath = getKibanaPath(config, projectRoot);
  const webpackConfig = getWebpackConfig(kibanaPath, projectRoot, config);
  const aliasEntries = Object.entries(webpackConfig.resolve.alias || {});

  context = {
    webpackConfig,
    aliasEntries,
  };

  return context;
}

function tryNodeResolver(importRequest, file, config) {
  return nodeResolver.resolve(
    importRequest,
    file,
    // we use Object.assign so that this file is compatible with slightly older
    // versions of node.js used by IDEs (eg. resolvers are run in the Electron
    // process in Atom)
    Object.assign({}, config, {
      extensions: ['.js', '.json', '.ts', '.tsx'],
      isFile,
    })
  );
}

exports.resolve = function resolveKibanaPath(importRequest, file, config) {
  config = config || {};

  if (config.forceNode) {
    return tryNodeResolver(importRequest, file, config);
  }

  const { webpackConfig, aliasEntries } = initContext(file, config);
  let isPathRequest = getIsPathRequest(importRequest);

  // if the importRequest is not a path we might be able to map it to a path
  // by comparing it to the webpack aliases. If we can convert it to a path
  // without actually invoking the webpack resolver we can save a lot of time
  if (!isPathRequest) {
    const resolvedAlias = resolveWebpackAlias(importRequest, aliasEntries);
    if (resolvedAlias) {
      importRequest = resolvedAlias;
      isPathRequest = true;
    }
  }

  // if the importRequest is a path, and it has a file extension, then
  // we just resolve it. This is most helpful with relative imports for
  // .css and .html files because those don't work with the node resolver
  // and we can resolve them much quicker than webpack
  if (isPathRequest && extname(importRequest)) {
    const abs = join(dirname(file), importRequest);
    if (isFile(abs)) {
      return {
        found: true,
        path: abs,
      };
    }
  }

  const nodeResult = tryNodeResolver(importRequest, file, config);
  if (nodeResult && nodeResult.found) {
    return nodeResult;
  }

  return webpackResolver.resolve(importRequest, file, {
    config: webpackConfig,
  });
};

// use version 2 of the resolver interface, https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#interfaceversion--number
exports.interfaceVersion = 2;
