/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');

/**
 * @param {{ rootDir: string }} options
 * @returns {string[]}
 */
function getPluginSearchPaths({ rootDir }) {
  return [Path.resolve(rootDir, '../kibana-extra'), Path.resolve(rootDir, 'plugins')];
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {import('./types').PluginCategoryInfo} category
 * @returns {boolean}
 */
function matchCategory(selector, category) {
  if (!category.oss && selector.oss) {
    return false;
  }

  if (category.example && !selector.examples) {
    return false;
  }

  if (category.testPlugin && !selector.testPlugins) {
    return false;
  }

  return true;
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {string} pkgDir
 * @returns {boolean}
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
 * @returns {boolean}
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
 * @returns {boolean}
 */
function matchParentDirsLimit(selector, pkgDir) {
  return !selector.limitParentDirs
    ? true
    : selector.limitParentDirs.some((p) => pkgDir.startsWith(p + Path.sep));
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {import('./types').PluginPackage} pkg
 * @returns {boolean}
 */
function matchBrowserServer(selector, pkg) {
  if (selector.browser && !pkg.manifest.plugin.browser) {
    return false;
  }
  if (selector.server && !pkg.manifest.plugin.server) {
    return false;
  }

  return true;
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {import('./types').PluginPackage} pkg
 * @returns {boolean}
 */
function matchPluginGroups(selector, pkg) {
  if (Array.isArray(selector.allowlistPluginGroups)) {
    return (
      // if the allowlist is defined, ensure the plugin belongs to one of the groups
      selector.allowlistPluginGroups.includes(pkg.group) ||
      // add an exception for example and test plugins (they might not have a group)
      pkg.group === 'common'
    );
  }

  return true;
}

/**
 * @param {import('./types').PluginSelector} selector
 * @returns {(pkg: import('./package').Package) => pkg is import('./types').PluginPackage}
 */
function getPluginPackagesFilter(selector = {}) {
  /**
   * @param {import('./package').Package} pkg
   * @returns {pkg is import('./types').PluginPackage}
   */
  return (pkg) =>
    pkg.isPlugin() &&
    matchBrowserServer(selector, pkg) &&
    matchParentDirsLimit(selector, pkg.directory) &&
    (matchCategory(selector, pkg.getPluginCategories()) ||
      matchPluginPaths(selector, pkg.directory) ||
      matchPluginParentDirs(selector, pkg.directory)) &&
    matchPluginGroups(selector, pkg);
}

module.exports = { getPluginSearchPaths, getPluginPackagesFilter };
