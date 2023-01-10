/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

      const localPatterns = [
        ...include.filter(isLocal).map(toRepoRel),
        ...exclude.filter(isLocal).map(toRepoRelExcl),
      ];
      const globalPatterns = [
        ...include.filter(isNotLocal).map(toRepoRel),
        ...exclude.filter(isNotLocal).map(toRepoRelExcl),
      ];

      const localMatch = localPatterns.length ? makeMatcher(localPatterns) : undefined;
      const globalMatch = globalPatterns.length ? makeMatcher(globalPatterns) : undefined;

      for (const path of allFiles) {
        if (
          localMatch &&
          (path.repoRelDir === tsProject.repoRelDir ||
            path.repoRelDir.startsWith(tsProject.repoRelDir + '/'))
        ) {
          if (localMatch(path.repoRel)) {
            this.filesByTsProject.add(tsProject, path);
          }
          continue;
        }

        if (globalMatch && globalMatch(path.repoRel)) {
          this.filesByTsProject.add(tsProject, path);
        }
      }
    }
  }

  getFiles(tsProject: TsProject): Iterable<RepoPath> {
    return this.filesByTsProject.get(tsProject) || [];
  }
}
