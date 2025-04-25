/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Package } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { TsProject } from '@kbn/ts-projects';

export abstract class LintTarget {
  constructor(
    /**
     * Repo relative path to the target
     */
    public readonly repoRel: string,

    /**
     * Absolute path to the the target
     */
    public readonly path: string,

    /**
     * Absolute directory all resolutions occur relative to
     */
    public readonly dir: string,

    /**
     * Name/id of the target
     */
    public readonly name: string
  ) {}

  /**
   * Turn a relative path (relative to the target's dir) into an absolute path
   */
  resolve(pkgRel: string) {
    return Path.resolve(this.dir, pkgRel);
  }

  /**
   * Turn an absolute path into a relative path from the dir of the target
   */
  getRel(abs: string) {
    return Path.relative(this.dir, abs);
  }

  isPackage(): this is PackageLintTarget {
    return this instanceof PackageLintTarget;
  }

  isTsProject(): this is TsProjectLintTarget {
    return this instanceof TsProjectLintTarget;
  }

  getTsProject(): any {
    return this.isPackage() || this.isTsProject() ? this.tsProject : undefined;
  }

  getPkg(): any {
    return this.isPackage() ? this.pkg : undefined;
  }
}

export class PackageLintTarget extends LintTarget {
  constructor(
    /**
     * The RepoPackage object for this LintPackage, access should be mediated through the LintPackage object so direct references are "deprecated"
     */
    public readonly pkg: Package,
    /**
     * The TsProject object for this LintPackage
     */
    public readonly tsProject?: TsProject
  ) {
    const path = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir);
    super(pkg.normalizedRepoRelativeDir, path, path, pkg.name);
  }

  hasTsProject(): this is PackageLintTarget & { tsProject: TsProject } {
    return !!this.tsProject;
  }
}

export class TsProjectLintTarget extends LintTarget {
  constructor(public readonly tsProject: TsProject) {
    super(tsProject.repoRel, tsProject.path, tsProject.directory, tsProject.name);
  }

  hasTsProject(): this is PackageLintTarget & { tsProject: TsProject } {
    return !!this.tsProject;
  }
}
