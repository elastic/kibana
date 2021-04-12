/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { dirname, resolve, parse } = require('path');
const { accessSync, readFileSync } = require('fs');

const { debug } = require('./debug');

function getConfig(config) {
  const defaults = {
    projectRoot: true,
  };

  if (!config || !config['@elastic/eslint-import-resolver-kibana']) return defaults;
  return Object.assign(defaults, config['@elastic/eslint-import-resolver-kibana']);
}

function getRootPackageDir(dirRoot, dir, rootPackageName) {
  if (dirRoot === dir) return null;
  const pkgFile = resolve(dir, 'package.json');

  try {
    accessSync(pkgFile);

    // if rootPackageName is not provided, stop when package.json is found
    if (!rootPackageName) return dir;

    // if rootPackageName is provided, check for match
    const { name, config } = JSON.parse(readFileSync(pkgFile));
    const { projectRoot } = getConfig(config);

    if (projectRoot && name === rootPackageName) return dir;

    // recurse until a matching package.json is found
    return getRootPackageDir(dirRoot, dirname(dir), rootPackageName);
  } catch (e) {
    if (e.code === 'ENOENT') return getRootPackageDir(dirRoot, dirname(dir), rootPackageName);
    throw e;
  }
}

exports.getProjectRoot = function (file, config) {
  const { root, dir } = parse(resolve(file));
  const { rootPackageName } = config;

  const projectRoot = getRootPackageDir(root, dir, rootPackageName);
  if (projectRoot === null) throw new Error('Failed to find plugin root');

  debug(`Resolved project root: ${projectRoot}`);
  return projectRoot;
};
