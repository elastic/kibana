/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project } from './project';

export class ProjectSet {
  public readonly outDirs: string[];
  private readonly projects: Project[];

  constructor(projects: Iterable<Project>) {
    this.projects = [...projects];
    this.outDirs = this.projects
      .map((p) => p.getOutDir())
      .filter((p): p is string => typeof p === 'string');
  }

  filterByPaths(paths: string[]) {
    return new ProjectSet(
      this.projects.filter((p) =>
        paths.some((f) => p.isAbsolutePathSelected(f) || p.getConfigPaths().includes(f))
      )
    );
  }
}
