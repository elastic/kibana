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
  return [Path.resolve(rootDir, '../kibana-extra'), Path.resolve(rootDir, 'plugins')];
}

/**
 * @param {import('./types').PluginSelector} selector
 * @param {import('./types').PluginCategoryInfo} category
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
 * @param {import('./types').PluginPackage} pkg
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
 * @param {string[] | undefined} packageNodeRoles
 */
function matchNodeRoles(selector, packageNodeRoles) {
  // no node roles, all plugins
  if (selector.nodeRoles == null) {
    return true;
  }

  // the migrator node needs to load all plugins, this can't be configured in the manifest
  if (selector.nodeRoles?.migrator) {
    return true;
  }

  // if the package doesn't specify the node roles, assume only for UI
  packageNodeRoles = packageNodeRoles || ['ui'];
  
  if (selector.nodeRoles?.ui && packageNodeRoles.includes('ui')) {
    return true;
  }

  if (selector.nodeRoles?.backgroundTasks && packageNodeRoles.includes('background_tasks')) {
    return true;
  }

  return false;
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
    matchBrowserServer(selector, pkg) &&
    matchParentDirsLimit(selector, pkg.directory) &&
    (matchCategory(selector, pkg.getPluginCategories()) ||
      matchPluginPaths(selector, pkg.directory) ||
      matchPluginParentDirs(selector, pkg.directory)) &&
    matchNodeRoles(selector, pkg.manifest.plugin.nodeRoles);
}

/**
 * @returns {(pkg: import('./package').Package) => boolean}
 */
function getDistributablePacakgesFilter() {
  return (pkg) => {
    if (pkg.isDevOnly()) {
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
