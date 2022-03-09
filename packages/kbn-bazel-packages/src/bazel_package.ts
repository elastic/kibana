/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';
import { REPO_ROOT } from '@kbn/utils';

const BUILD_RULE_NAME = /(^|\s)name\s*=\s*"build"/;
const BUILD_TYPES_RULE_NAME = /(^|\s)name\s*=\s*"build_types"/;

export class BazelPackage {
  static async fromDir(dir: string) {
    let pkg;
    try {
      pkg = JSON.parse(await Fsp.readFile(Path.resolve(dir, 'package.json'), 'utf8'));
    } catch (error) {
      throw new Error(`unable to parse package.json in [${dir}]: ${error.message}`);
    }

    let buildBazelContent;
    if (pkg.name !== '@kbn/pm') {
      try {
        buildBazelContent = await Fsp.readFile(Path.resolve(dir, 'BUILD.bazel'), 'utf8');
      } catch (error) {
        throw new Error(`unable to read BUILD.bazel file in [${dir}]: ${error.message}`);
      }
    }

    return new BazelPackage(Path.relative(REPO_ROOT, dir), pkg, buildBazelContent);
  }

  constructor(
    public readonly repoRelativeDir: string,
    public readonly pkg: any,
    public readonly buildBazelContent?: string
  ) {}

  hasBuildRule() {
    return !!(this.buildBazelContent && BUILD_RULE_NAME.test(this.buildBazelContent));
  }

  hasBuildTypesRule() {
    return !!(this.buildBazelContent && BUILD_TYPES_RULE_NAME.test(this.buildBazelContent));
  }
}
