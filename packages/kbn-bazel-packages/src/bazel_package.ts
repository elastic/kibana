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

const BUILD_RULE_NAME = /(^|\s)name\s*=\s*"build"/;
const BUILD_TYPES_RULE_NAME = /(^|\s)name\s*=\s*"build_types"/;

/**
 * Simple parsed representation of a package.json file, validated
 * by `assertParsedPackageJson()` and extensible as needed in the future
 */
export interface ParsedPackageJson {
  /**
   * The name of the package, usually `@kbn/`+something
   */
  name: string;
  /**
   * All other fields in the package.json are typed as unknown as all we need at this time is "name"
   */
  [key: string]: unknown;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!(typeof v === 'object' && v);
}

function assertParsedPackageJson(v: unknown): asserts v is ParsedPackageJson {
  if (!isObj(v) || typeof v.name !== 'string') {
    throw new Error('Expected parsed package.json to be an object with at least a "name" property');
  }
}

/**
 * Representation of a Bazel Package in the Kibana repository
 */
export class BazelPackage {
  /**
   * Create a BazelPackage object from a package directory. Reads some files from the package and returns
   * a Promise for a BazelPackage instance
   */
  static async fromDir(dir: string) {
    let pkg;
    try {
      pkg = JSON.parse(await Fsp.readFile(Path.resolve(dir, 'package.json'), 'utf8'));
    } catch (error) {
      throw new Error(`unable to parse package.json in [${dir}]: ${error.message}`);
    }

    assertParsedPackageJson(pkg);

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
