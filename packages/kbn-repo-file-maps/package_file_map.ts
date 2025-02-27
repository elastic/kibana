/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { SetMap } from '@kbn/set-map';
import type { Package } from '@kbn/repo-packages';
import type { RepoPath } from '@kbn/repo-path';
import type { LintTarget } from '@kbn/repo-linter';

export class PackageFileMap {
  private readonly filesByPackage = new SetMap<Package, RepoPath>();
  private readonly packagesByFile = new Map<string, Package>();
  private readonly unassignedFiles: RepoPath[] = [];

  constructor(packages: Package[], private readonly allFiles: Iterable<RepoPath>) {
    const repoRelCache = new Map<string, Package | null>(
      packages.map((p) => [p.normalizedRepoRelativeDir, p])
    );

    const findPkg = (repoRel: string): Package | null => {
      if (repoRel === '.') {
        return null;
      }

      const cached = repoRelCache.get(repoRel);
      if (cached !== undefined) {
        return cached;
      }

      const pkg = findPkg(Path.dirname(repoRel));
      repoRelCache.set(repoRel, pkg);
      return pkg;
    };

    for (const file of allFiles) {
      const pkg = findPkg(file.repoRel);

      if (!pkg) {
        this.unassignedFiles.push(file);
        continue;
      }

      this.packagesByFile.set(file.repoRel, pkg);
      this.filesByPackage.add(pkg, file);
    }
  }

  getAllFiles() {
    return Array.from(this.allFiles);
  }

  getFiles(pkg: Package): Iterable<RepoPath> {
    return this.filesByPackage.get(pkg) ?? [];
  }

  getPackage(repoRel: string) {
    return this.packagesByFile.get(repoRel);
  }

  getUnassigned(): Iterable<RepoPath> {
    return Array.from(this.unassignedFiles);
  }

  getFilesForLintTarget(target: LintTarget): Iterable<RepoPath> {
    const pkg = target.getPkg();
    return (pkg && this.filesByPackage.get(pkg)) || [];
  }
}
