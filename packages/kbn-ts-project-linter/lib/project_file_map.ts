/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import globby from 'globby';

import { asyncForEachWithLimit } from '@kbn/std';
import { RepoPath } from '@kbn/repo-path';
import { REPO_ROOT } from '@kbn/repo-info';
import { Project } from '@kbn/ts-projects';

export class ProjectFileMap {
  private readonly filesByProject = new Map<Project, RepoPath[]>();

  async preload(projects: Project[]) {
    await asyncForEachWithLimit(projects, 5, async (project) => {
      const paths = await globby(project.config.include ?? [], {
        ignore: project.config.exclude ?? [],
        cwd: project.directory,
        onlyFiles: true,
        absolute: true,
      });

      this.filesByProject.set(
        project,
        paths.map((path) => new RepoPath(REPO_ROOT, Path.relative(REPO_ROOT, path)))
      );
    });
  }

  getFiles(project: Project) {
    const cached = this.filesByProject.get(project);
    if (cached) {
      return cached;
    }

    const files = globby
      .sync(project.config.include ?? [], {
        ignore: project.config.exclude ?? [],
        cwd: project.directory,
        onlyFiles: true,
        absolute: true,
      })
      .map((abs) => {
        return new RepoPath(REPO_ROOT, Path.relative(REPO_ROOT, abs));
      });

    this.filesByProject.set(project, files);

    return files;
  }
}
