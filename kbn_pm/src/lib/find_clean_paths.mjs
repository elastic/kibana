/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from './paths.mjs';
import External from './external_packages.js';

/**
 * Attempt to load the package map, if bootstrap hasn't run successfully
 * this might fail.
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @returns {Promise<import('@kbn/repo-packages').PackageMap>}
 */
async function tryToGetPackageMap(log) {
  try {
    const { readPackageMap } = External['@kbn/repo-packages']();
    return readPackageMap();
  } catch (error) {
    log.warning('unable to load package map, unable to clean target directories in packages');
    return new Map();
  }
}

/**
 * @param {string} packageDir
 * @returns {string[]}
 */
export function readCleanPatterns(packageDir) {
  let json;
  try {
    const path = Path.resolve(packageDir, 'package.json');
    json = JSON.parse(Fs.readFileSync(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  /** @type {string[]} */
  const patterns = json.kibana?.clean?.extraPatterns ?? [];

  return patterns.flatMap((pattern) => {
    const absolute = Path.resolve(packageDir, pattern);

    // sanity check to make sure that resolved patterns are "relative" to
    // the package dir, if they start with a . then they traverse out of
    // the package dir so we drop them
    if (Path.relative(packageDir, absolute).startsWith('.')) {
      return [];
    }

    return absolute;
  });
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @returns {Promise<string[]>}
 */
export async function findPluginCleanPaths(log) {
  const packageMap = await tryToGetPackageMap(log);
  return [...packageMap.values()].flatMap((repoRelativePath) => {
    const pkgDir = Path.resolve(REPO_ROOT, repoRelativePath);
    return [Path.resolve(pkgDir, 'target'), ...readCleanPatterns(pkgDir)];
  });
}
