/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import multimatch from 'multimatch';
import isPathInside from 'is-path-inside';

import { resolveDepsForProject, YarnLock } from './yarn_lock';
import { Log } from './log';
import { ProjectMap, getProjects, includeTransitiveProjects } from './projects';
import { Project } from './project';
import { getProjectPaths } from '../config';

/**
 * Helper class for dealing with a set of projects as children of
 * the Kibana project. The kbn/pm is currently implemented to be
 * more generic, where everything is an operation of generic projects,
 * but that leads to exceptions where we need the kibana project and
 * do things like `project.get('kibana')!`.
 *
 * Using this helper we can restructre the generic list of projects
 * as a Kibana object which encapulates all the projects in the
 * workspace and knows about the root Kibana project.
 */
export class Kibana {
  static async loadFrom(rootPath: string) {
    return new Kibana(await getProjects(rootPath, getProjectPaths({ rootPath })));
  }

  public readonly kibanaProject: Project;

  constructor(private readonly allWorkspaceProjects: ProjectMap) {
    const kibanaProject = allWorkspaceProjects.get('kibana');

    if (!kibanaProject) {
      throw new TypeError(
        'Unable to create Kibana object without all projects, including the Kibana project.'
      );
    }

    this.kibanaProject = kibanaProject;
  }

  /** make an absolute path by resolving subPath relative to the kibana repo */
  getAbsolute(...subPath: string[]) {
    return Path.resolve(this.kibanaProject.path, ...subPath);
  }

  /** convert an absolute path to a relative path, relative to the kibana repo */
  getRelative(absolute: string) {
    return Path.relative(this.kibanaProject.path, absolute);
  }

  /** get a copy of the map of all projects in the kibana workspace */
  getAllProjects() {
    return new Map(this.allWorkspaceProjects);
  }

  /** determine if a project with the given name exists */
  hasProject(name: string) {
    return this.allWorkspaceProjects.has(name);
  }

  /** get a specific project, throws if the name is not known (use hasProject() first) */
  getProject(name: string) {
    const project = this.allWorkspaceProjects.get(name);

    if (!project) {
      throw new Error(`No package with name "${name}" in the workspace`);
    }

    return project;
  }

  /** get a project and all of the projects it depends on in a ProjectMap */
  getProjectAndDeps(name: string) {
    const project = this.getProject(name);
    return includeTransitiveProjects([project], this.allWorkspaceProjects);
  }

  /** filter the projects to just those matching certain paths/include/exclude tags */
  getFilteredProjects(options: {
    skipKibanaPlugins: boolean;
    ossOnly: boolean;
    exclude: string[];
    include: string[];
  }) {
    const allProjects = this.getAllProjects();
    const filteredProjects: ProjectMap = new Map();

    const pkgJsonPaths = Array.from(allProjects.values()).map((p) => p.packageJsonLocation);
    const filteredPkgJsonGlobs = getProjectPaths({
      ...options,
      rootPath: this.kibanaProject.path,
    }).map((g) => Path.resolve(g, 'package.json'));
    const matchingPkgJsonPaths = multimatch(pkgJsonPaths, filteredPkgJsonGlobs);

    for (const project of allProjects.values()) {
      const pathMatches = matchingPkgJsonPaths.includes(project.packageJsonLocation);
      const notExcluded = !options.exclude.includes(project.name);
      const isIncluded = !options.include.length || options.include.includes(project.name);

      if (pathMatches && notExcluded && isIncluded) {
        filteredProjects.set(project.name, project);
      }
    }

    return filteredProjects;
  }

  isPartOfRepo(project: Project) {
    return (
      project.path === this.kibanaProject.path ||
      isPathInside(project.path, this.kibanaProject.path)
    );
  }

  isOutsideRepo(project: Project) {
    return !this.isPartOfRepo(project);
  }

  resolveAllProductionDependencies(yarnLock: YarnLock, log: Log) {
    const kibanaDeps = resolveDepsForProject({
      project: this.kibanaProject,
      yarnLock,
      kbn: this,
      includeDependentProject: true,
      productionDepsOnly: true,
      log,
    })!;

    const xpackDeps = resolveDepsForProject({
      project: this.getProject('x-pack')!,
      yarnLock,
      kbn: this,
      includeDependentProject: true,
      productionDepsOnly: true,
      log,
    })!;

    return new Map([...kibanaDeps.entries(), ...xpackDeps.entries()]);
  }

  getUuid() {
    try {
      return Fs.readFileSync(this.getAbsolute('data/uuid'), 'utf-8').trim();
    } catch (error) {
      if (error.code === 'ENOENT') {
        return undefined;
      }

      throw error;
    }
  }
}
