/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

/**
 * @param {{ rootDir: string }} options
 * @returns {string[]}
 */
function getPluginSearchPaths({ rootDir }) {
  return [Path.resolve(rootDir, '../kibana-extra')];
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {import('./types').PluginCategoryInfo} type
 */
function matchType(selector, type) {
  if (!type.oss && selector.oss) {
    return false;
  }

  if (type.example && !selector.examples) {
    return false;
  }

  if (type.testPlugin && !selector.testPlugins) {
    return false;
  }

  return true;
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {string} pkgDir
 */
function matchPluginPaths(selector, pkgDir) {
  if (!selector.paths) {
    return false;
  }

  return selector.paths.some((p) => p === pkgDir);
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {string} pkgDir
 */
function matchPluginParentDirs(selector, pkgDir) {
  if (!selector.parentDirs) {
    return false;
  }

  return selector.parentDirs.some((p) => pkgDir.startsWith(p + Path.sep));
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {string} pkgDir
 */
function matchParentDirsLimit(selector, pkgDir) {
  return !selector.limitParentDirs
    ? true
    : selector.limitParentDirs.some((p) => pkgDir.startsWith(p + Path.sep));
}

/**
 * @param {import('./types').PluginSelector} selector
 */
function getPluginPackagesFilter(selector = {}) {
  /**
   * @param {import('./package').Package} pkg
   * @returns {pkg is import('./types').PluginPackage}
   */
  return (pkg) =>
    pkg.isPlugin() &&
    matchParentDirsLimit(selector, pkg.directory) &&
    (matchType(selector, pkg.getPluginCategories()) ||
      matchPluginPaths(selector, pkg.directory) ||
      matchPluginParentDirs(selector, pkg.directory));
}

/**
 * @returns {(pkg: import('./package').Package) => boolean}
 */
function getDistributablePacakgesFilter() {
  return (pkg) => {
    if (
      pkg.isDevOnly ||
      pkg.manifest.type === 'functional-tests' ||
      pkg.manifest.type === 'test-helper'
    ) {
      return false;
    }

    if (!pkg.isPlugin()) {
      return true;
    }

    const type = pkg.getPluginCategories();
    return !(type.example || type.testPlugin);
  };
}

module.exports = { getPluginSearchPaths, getPluginPackagesFilter, getDistributablePacakgesFilter };
