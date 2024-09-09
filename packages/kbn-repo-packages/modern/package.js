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
    return a.manifest.id.localeCompare(b.manifest.id);
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
