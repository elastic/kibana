/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { inspect } = require('util');
const Path = require('path');

const { readPackageJson } = require('./parse_package_json');
const { PLUGIN_CATEGORY } = require('./plugin_category_info');
const { readPackageManifest } = require('./parse_package_manifest');

/**
 * Normalize a path for operating systems which use backslashes
 * @param {string} path
 */
const normalize = (path) => (Path.sep !== '/' ? path.split('\\').join('/') : path);

/**
 * Representation of a Bazel Package in the Kibana repository
 * @class
 */
class Package {
  /**
   * Create a Package object from a package directory. Reads some files from the package and returns
   * a Promise for a Package instance.
   * @param {string} repoRoot
   * @param {string} path
   */
  static fromManifest(repoRoot, path) {
    const manifest = readPackageManifest(repoRoot, path);
    const dir = Path.dirname(path);

    return new Package(repoRoot, dir, manifest, readPackageJson(Path.resolve(dir, 'package.json')));
  }

  /**
   * Sort an array of packages
   * @param {Package} a
   * @param {Package} b
   */
  static sorter(a, b) {
    return a.manifest.id.localeCompare(b.manifest.id, 'en');
  }

  /**
   * @private
   */
  constructor(
    /**
     * Absolute path to the root of the repository
     * @type {string}
     */
    repoRoot,
    /**
     * Absolute path to the package directory
     * @type {string}
     */
    dir,
    /**
     * Parsed kibana.jsonc manifest from the package
     * @type {import('./types').KibanaPackageManifest}
     */
    manifest,
    /**
     * Parsed package.json file from the package
     * @type {import('./types').ParsedPackageJson | undefined}
     */
    pkg
  ) {
    /**
     * Absolute path to this package directory
     * @type {string}
     * @readonly
     */
    this.directory = dir;

    /**
     * repo relative path to the root of the package
     * @type {string}
     * @readonly
     */
    this.normalizedRepoRelativeDir = normalize(Path.relative(repoRoot, dir));

    /**
     * copy of the parsed kibana.jsonc manifest of the package
     *
     * @type {import('./types').KibanaPackageManifest}
     * @readonly
     * @deprecated rather than accessing this directly the necessary information about the package should be reflected on the Package class.
     */
    this.manifest = manifest;

    /**
     * copy of the parsed package.json file in the package
     * @type {import('./types').ParsedPackageJson | undefined}
     * @readonly
     * @deprecated rather than accessing this directly the necessary information about the package should be reflected on the Package class.
     */
    this.pkg = pkg;

    /**
     * the name/import id of the package
     * @type {string}
     * @readonly
     */
    this.name = manifest.id;

    /**
     * the name/import id of the package
     * @type {string}
     * @readonly
     */
    this.id = manifest.id;

    const { group, visibility } = this.determineGroupAndVisibility();

    /**
     * the group to which this package belongs
     * @type {import('@kbn/repo-info/types').ModuleGroup}
     * @readonly
     */

    this.group = group;
    /**
     * the visibility of this package, i.e. whether it can be accessed by everybody or only modules in the same group
     * @type {import('@kbn/repo-info/types').ModuleVisibility}
     * @readonly
     */
    this.visibility = visibility;
  }

  /**
   * Is this package highlighted as a "dev only" package? If so it will always
   * be listed in the devDependencies and will never end up in the build
   * @returns {boolean}
   */
  isDevOnly() {
    return (
      !!this.manifest.devOnly ||
      this.manifest.type === 'functional-tests' ||
      this.manifest.type === 'test-helper'
    );
  }

  /**
   * Does this package expose a plugin, is it of one of the plugin types?
   * @readonly
   * @returns {this is import('./types').PluginPackage}
   */
  isPlugin() {
    return this.manifest.type === 'plugin';
  }

  /**
   * Returns the group to which this package belongs
   * @readonly
   * @returns {import('@kbn/repo-info/types').ModuleGroup}
   */
  getGroup() {
    return this.group;
  }

  /**
   * Returns the package visibility, i.e. whether it can be accessed by everybody or only packages in the same group
   * @readonly
   * @returns {import('@kbn/repo-info/types').ModuleVisibility}
   */
  getVisibility() {
    return this.visibility;
  }

  /**
   * Returns true if the package represents some type of plugin
   * @returns {import('./types').PluginCategoryInfo}
   */
  getPluginCategories() {
    if (!this.isPlugin()) {
      throw new Error('package is not a plugin, check pkg.isPlugin before calling this method');
    }

    const preCalculated = this.manifest.plugin[PLUGIN_CATEGORY];
    if (preCalculated) {
      return { ...preCalculated };
    }

    const dir = this.normalizedRepoRelativeDir;
    const oss = !dir.startsWith('x-pack/');
    const example = dir.startsWith('examples/') || dir.startsWith('x-pack/examples/');
    const testPlugin = dir.startsWith('test/') || dir.startsWith('x-pack/test/');

    return {
      oss,
      example,
      testPlugin,
    };
  }

  determineGroupAndVisibility() {
    const dir = this.normalizedRepoRelativeDir;

    /** @type {import('@kbn/repo-info/types').ModuleGroup} */
    let group = 'common';
    /** @type {import('@kbn/repo-info/types').ModuleVisibility} */
    let visibility = 'shared';

    if (dir.startsWith('src/platform/') || dir.startsWith('x-pack/platform/')) {
      group = 'platform';
      visibility =
        /src\/platform\/[^\/]+\/shared/.test(dir) || /x-pack\/platform\/[^\/]+\/shared/.test(dir)
          ? 'shared'
          : 'private';
    } else if (dir.startsWith('x-pack/solutions/search/')) {
      group = 'search';
      visibility = 'private';
    } else if (dir.startsWith('x-pack/solutions/security/')) {
      group = 'security';
      visibility = 'private';
    } else if (dir.startsWith('x-pack/solutions/observability/')) {
      group = 'observability';
      visibility = 'private';
    } else {
      group = this.manifest.group ?? 'common';
      // if the group is 'private-only', enforce it
      visibility = ['search', 'security', 'observability'].includes(group)
        ? 'private'
        : this.manifest.visibility ?? 'shared';
    }

    return { group, visibility };
  }

  /**
   * Custom inspect handler so that logging variables in scripts/generate doesn't
   * print all the BUILD.bazel files
   */
  [inspect.custom]() {
    return `${this.isPlugin() ? `PluginPackage` : `Package`}<${this.normalizedRepoRelativeDir}>`;
  }
}

module.exports = {
  Package,
};
