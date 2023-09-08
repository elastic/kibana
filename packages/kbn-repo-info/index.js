/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef {import('./types').KibanaPackageJson} KibanaPackageJson */

const Path = require('path');
const Fs = require('fs');

/**
 * @param {string} path
 * @returns {undefined | KibanaPackageJson}
 */
const readKibanaPkgJson = (path) => {
  try {
    const json = JSON.parse(Fs.readFileSync(path, 'utf8'));
    if (json && typeof json === 'object' && 'name' in json && json.name === 'kibana') {
      return json;
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
};

const findKibanaPackageJson = () => {
  // search for the kibana directory, since this file is moved around it might
  // not be where we think but should always be a relatively close parent
  // of this directory
  const startDir = __dirname;
  const { root: rootDir } = Path.parse(startDir);
  let cursor = startDir;
  while (true) {
    const packageJsonPath = Path.resolve(cursor, 'package.json');
    const kibanaPkgJson = readKibanaPkgJson(packageJsonPath);

    if (kibanaPkgJson) {
      return {
        // we use `Fs.realpathSync()` to resolve the package.json path to the actual file
        // in the repo rather than the sym-linked version if it is symlinked
        kibanaDir: Path.dirname(Fs.realpathSync(packageJsonPath)),
        kibanaPkgJson,
      };
    }

    const parent = Path.dirname(cursor);
    if (parent === rootDir) {
      throw new Error(`unable to find kibana directory from ${startDir}`);
    }
    cursor = parent;
  }
};

const { kibanaDir, kibanaPkgJson } = findKibanaPackageJson();

const REPO_ROOT = kibanaDir;
const PKG_JSON = kibanaPkgJson;
const UPSTREAM_BRANCH = kibanaPkgJson.branch;

/**
 * @param {string[]} paths
 */
const fromRoot = (...paths) => Path.resolve(REPO_ROOT, ...paths);

module.exports = {
  REPO_ROOT,
  PKG_JSON,
  kibanaPackageJson: PKG_JSON,
  isKibanaDistributable: () => !!PKG_JSON.build.distributable,
  UPSTREAM_BRANCH,
  fromRoot,
};
