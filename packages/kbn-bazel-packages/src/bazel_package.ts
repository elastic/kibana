/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';
import Path from 'path';
import Fsp from 'fs/promises';

import normalizePath from 'normalize-path';
import { REPO_ROOT } from '@kbn/utils';

import { readPackageJson, ParsedPackageJson } from './parse_package_json';

const BUILD_RULE_NAME = /(^|\s)name\s*=\s*"build"/;
const BUILD_TYPES_RULE_NAME = /(^|\s)name\s*=\s*"build_types"/;

/**
 * Representation of a Bazel Package in the Kibana repository
 */
export class BazelPackage {
  /**
   * Create a BazelPackage object from a package directory. Reads some files from the package and returns
   * a Promise for a BazelPackage instance.
   */
  static async fromDir(dir: string) {
    const pkg = readPackageJson(Path.resolve(dir, 'package.json'));

    let buildBazelContent;
    if (pkg.name !== '@kbn/pm') {
      try {
        buildBazelContent = await Fsp.readFile(Path.resolve(dir, 'BUILD.bazel'), 'utf8');
      } catch (error) {
        throw new Error(`unable to read BUILD.bazel file in [${dir}]: ${error.message}`);
      }
    }

    return new BazelPackage(normalizePath(Path.relative(REPO_ROOT, dir)), pkg, buildBazelContent);
  }

  constructor(
    /**
     * Relative path from the root of the repository to the package directory
     */
    public readonly normalizedRepoRelativeDir: string,
    /**
     * Parsed package.json file from the package
     */
    public readonly pkg: ParsedPackageJson,
    /**
     * Content of the BUILD.bazel file
     */
    private readonly buildBazelContent?: string
  ) {}

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
   * Custom inspect handler so that logging variables in scripts/generate doesn't
   * print all the BUILD.bazel files
   */
  [inspect.custom]() {
    return `BazelPackage<${this.normalizedRepoRelativeDir}>`;
  }
}
