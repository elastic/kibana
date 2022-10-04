/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { inspect } = require('util');
const Path = require('path');
const Fsp = require('fs/promises');

const { readPackageJson } = require('./parse_package_json');
const { readPackageManifest } = require('./parse_package_manifest');

const BUILD_RULE_NAME = /(^|\s)name\s*=\s*"build"/;
const BUILD_TYPES_RULE_NAME = /(^|\s)name\s*=\s*"build_types"/;

/**
 * Representation of a Bazel Package in the Kibana repository
 * @class
 * @property {string} normalizedRepoRelativeDir
 * @property {import('./types').KibanaPackageManifest} manifest
 * @property {import('./types').ParsedPackageJson | undefined} pkg
 * @property {string | undefined} buildBazelContent
 */
class BazelPackage {
  /**
   * Create a BazelPackage object from a package directory. Reads some files from the package and returns
   * a Promise for a BazelPackage instance.
   * @param {string} repoRoot
   * @param {string} path
   */
  static async fromManifest(repoRoot, path) {
    const manifest = readPackageManifest(path);
    const dir = Path.dirname(path);

    let buildBazelContent;
    try {
      buildBazelContent = await Fsp.readFile(Path.resolve(dir, 'BUILD.bazel'), 'utf8');
    } catch (error) {
      throw new Error(`unable to read BUILD.bazel file in [${dir}]: ${error.message}`);
    }

    return new BazelPackage(
      Path.relative(repoRoot, dir),
      manifest,
      readPackageJson(Path.resolve(dir, 'package.json')),
      buildBazelContent
    );
  }

  /**
   * Sort a list of bazek packages
   * @param {BazelPackage[]} pkgs
   */
  static sort(pkgs) {
    return pkgs.slice().sort(BazelPackage.sorter);
  }

  /**
   * Sort an array of bazel packages
   * @param {BazelPackage} a
   * @param {BazelPackage} b
   */
  static sorter(a, b) {
    return a.normalizedRepoRelativeDir.localeCompare(b.normalizedRepoRelativeDir);
  }

  constructor(
    /**
     * Relative path from the root of the repository to the package directory
     * @type {string}
     */
    normalizedRepoRelativeDir,
    /**
     * Parsed kibana.jsonc manifest from the package
     * @type {import('./types').KibanaPackageManifest}
     */
    manifest,
    /**
     * Parsed package.json file from the package
     * @type {import('./types').ParsedPackageJson | undefined}
     */
    pkg,
    /**
     * Content of the BUILD.bazel file
     * @type {string | undefined}
     */
    buildBazelContent = undefined
  ) {
    this.normalizedRepoRelativeDir = normalizedRepoRelativeDir;
    this.manifest = manifest;
    this.pkg = pkg;
    this.buildBazelContent = buildBazelContent;
  }

  /**
   * Returns true if the package includes a `:build` bazel rule
   */
  hasBuildRule() {
    return !!(this.buildBazelContent && BUILD_RULE_NAME.test(this.buildBazelContent));
  }

  /**
   * Returns true if the package includes a `:build_types` bazel rule
   */
  hasBuildTypesRule() {
    return !!(this.buildBazelContent && BUILD_TYPES_RULE_NAME.test(this.buildBazelContent));
  }

  /**
   * Returns true if the package is not intended to be in the build
   */
  isDevOnly() {
    return !!this.manifest.devOnly;
  }

  /**
   * Custom inspect handler so that logging variables in scripts/generate doesn't
   * print all the BUILD.bazel files
   */
  [inspect.custom]() {
    return `BazelPackage<${this.normalizedRepoRelativeDir}>`;
  }
}

module.exports = {
  BazelPackage,
};
