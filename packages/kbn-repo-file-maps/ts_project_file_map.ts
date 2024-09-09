/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { SetMap } from '@kbn/set-map';
import { RepoPath } from '@kbn/repo-path';
import { makeMatcher } from '@kbn/picomatcher';
import { TsProject } from '@kbn/ts-projects';

import { PackageFileMap } from './package_file_map';

export class TsProjectFileMap {
  private readonly filesByTsProject = new SetMap<TsProject, RepoPath>();

  constructor(pkgFileMap: PackageFileMap, tsProjects: TsProject[]) {
    const isNotLocal = (p: string) => p.startsWith('..');
    const isLocal = (p: string) => !isNotLocal(p);
    const allFiles = pkgFileMap.getAllFiles();

    for (const tsProject of tsProjects) {
      const toRepoRel = (p: string) =>
        Path.relative(REPO_ROOT, Path.resolve(tsProject.directory, p));
      const toRepoRelExcl = (p: string) => `!${toRepoRel(p)}`;

      const include = tsProject.config.include ?? [];
      const exclude = tsProject.config.exclude ?? [];
      const pkg = tsProject.pkg;

      const localPatterns = pkg
        ? [...include.filter(isLocal).map(toRepoRel), ...exclude.filter(isLocal).map(toRepoRelExcl)]
        : [];

      const externalPatterns = pkg
        ? [
            ...include.filter(isNotLocal).map(toRepoRel),
            ...exclude.filter(isNotLocal).map(toRepoRelExcl),
          ]
        : [...include.map(toRepoRel), ...exclude.map(toRepoRelExcl)];

      const localMatch = pkg && localPatterns.length ? makeMatcher(localPatterns) : undefined;
      const externalMatch = externalPatterns.length ? makeMatcher(externalPatterns) : undefined;

      if (localMatch && pkg) {
        const localFiles = pkgFileMap.getFiles(pkg) ?? [];
        for (const local of localFiles) {
          if (localMatch(local.repoRel)) {
            this.filesByTsProject.add(tsProject, local);
          }
        }
      }

      if (externalMatch) {
        for (const external of allFiles) {
          if (externalMatch(external.repoRel)) {
            this.filesByTsProject.add(tsProject, external);
          }
        }
      }
    }
  }

  getFiles(tsProject: TsProject): Iterable<RepoPath> {
    return this.filesByTsProject.get(tsProject) || [];
  }
}
