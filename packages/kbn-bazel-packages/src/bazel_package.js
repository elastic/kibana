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

/** @typedef {import('./types').ParsedPackageJson} ParsedPackageJson */
const { readPackageJson } = require('./parse_package_json');

const BUILD_RULE_NAME = /(^|\s)name\s*=\s*"build"/;
const BUILD_TYPES_RULE_NAME = /(^|\s)name\s*=\s*"build_types"/;

/**
 * Representation of a Bazel Package in the Kibana repository
 * @class
 * @property {string} normalizedRepoRelativeDir
 * @property {import('./types').ParsedPackageJson} pkg
 * @property {string | undefined} buildBazelContent
 */
class BazelPackage {
  /**
   * Create a BazelPackage object from a package directory. Reads some files from the package and returns
   * a Promise for a BazelPackage instance.
   * @param {string} repoRoot
   * @param {string} dir
   */
  static async fromDir(repoRoot, dir) {
    const pkg = readPackageJson(Path.resolve(dir, 'package.json'));

    let buildBazelContent;
    try {
      buildBazelContent = await Fsp.readFile(Path.resolve(dir, 'BUILD.bazel'), 'utf8');
    } catch (error) {
      throw new Error(`unable to read BUILD.bazel file in [${dir}]: ${error.message}`);
    }

    return new BazelPackage(Path.relative(repoRoot, dir), pkg, buildBazelContent);
  }

  constructor(
    /**
     * Relative path from the root of the repository to the package directory
     * @type {string}
     */
    normalizedRepoRelativeDir,
    /**
     * Parsed package.json file from the package
     * @type {import('./types').ParsedPackageJson}
     */
    pkg,
    /**
     * Content of the BUILD.bazel file
     * @type {string | undefined}
     */
    buildBazelContent = undefined
  ) {
    this.normalizedRepoRelativeDir = normalizedRepoRelativeDir;
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
    return !!this.pkg.kibana?.devOnly;
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
