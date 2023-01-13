/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ImportResolver } from '@kbn/import-resolver';
import normalizePath from 'normalize-path';

import { PkgInfo } from './pkg_info';

const getNormal = Path.sep === '/' ? (path: string) => path : normalizePath;

/**
 * A wraper around an absolute path in the repository. We create this object and bind it
 * to a specific ImportResolver primarily so that we can use it as a key in WeakMap instances
 * and make analysis as efficient as possible.
 *
 * Instead of managing many caches in a stateful class somewhere we instead write memoized
 * functions which use weakmaps that are key'd off of a RepoPath instance. RepoPath instances
 * are then cached by the overall classifier, and that instance can then be cached by
 * the tool running analysis on the repository
 */
export class RepoPath {
  constructor(public readonly absolute: string, public readonly resolver: ImportResolver) {}

  private extname: string | undefined;
  /** Get the extention for this path */
  getExtname() {
    if (this.extname === undefined) {
      this.extname = Path.extname(this.absolute);
    }

    return this.extname;
  }

  private filename: string | undefined;
  /** Get the filename, without the extension, for this path */
  getFilename() {
    if (this.filename === undefined) {
      this.filename = Path.basename(this.absolute, this.getExtname());
    }

    return this.filename;
  }

  private repoRel: string | undefined;
  /** get and cache the repo-relative version of the path */
  getRepoRel() {
    if (this.repoRel === undefined) {
      this.repoRel = getNormal(Path.relative(REPO_ROOT, this.absolute));
    }

    return this.repoRel;
  }

  private segs: string[] | undefined;
  /** get and cache the path segments from the repo-realtive versions of this path */
  getSegs() {
    if (this.segs === undefined) {
      this.segs = Path.dirname(this.getRepoRel()).split('/');
    }

    return this.segs;
  }

  private pkgInfo: PkgInfo | null | undefined;
  /** get and cache the package info for a path */
  getPkgInfo() {
    if (this.pkgInfo === undefined) {
      const pkgId = this.resolver.getPackageIdForPath(this.absolute);
      if (!pkgId) {
        this.pkgInfo = null;
      } else {
        const pkgDir = this.resolver.getAbsolutePackageDir(pkgId);
        if (!pkgDir) {
          throw new Error(`unable to get package directory for package [${pkgId}]`);
        }

        const rel = getNormal(Path.relative(pkgDir, this.absolute));
        if (rel.startsWith(`../`)) {
          throw new Error(
            `path [${this.getRepoRel()}] does not apear to be within package [${pkgId}]`
          );
        }

        this.pkgInfo = {
          pkgDir,
          pkgId,
          rel,
          isBazelPackage: this.resolver.isBazelPackage(pkgId),
        };
      }
    }

    return this.pkgInfo;
  }
}
