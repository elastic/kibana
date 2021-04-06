/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname, relative, resolve, sep } from 'path';

import { chmod, createSymlink, isFile, mkdirp } from './fs';
import { log } from './log';
import { ProjectGraph, ProjectMap } from './projects';

/**
 * Yarn does not link the executables from dependencies that are installed
 * using `link:` https://github.com/yarnpkg/yarn/pull/5046
 *
 * We simulate this functionality by walking through each project's project
 * dependencies, and manually linking their executables if defined. The logic
 * for linking was mostly adapted from lerna: https://github.com/lerna/lerna/blob/1d7eb9eeff65d5a7de64dea73613b1bf6bfa8d57/src/PackageUtilities.js#L348
 */
export async function linkProjectExecutables(
  projectsByName: ProjectMap,
  projectGraph: ProjectGraph
) {
  log.debug(`Linking package executables`);

  // Find root and generate executables from dependencies for it
  let rootProject = null;
  let rootProjectDeps = [] as any;
  for (const [projectName, projectDeps] of projectGraph) {
    const project = projectsByName.get(projectName)!;
    if (project.isSinglePackageJsonProject) {
      rootProject = projectsByName.get(projectName);
      rootProjectDeps = projectDeps;
      break;
    }
  }

  if (!rootProject) {
    throw new Error('Could not finding root project while linking package executables');
  }

  // Prepare root project node_modules/.bin
  const rootBinsDir = resolve(rootProject.nodeModulesLocation, '.bin');
  for (const rootProjectDep of rootProjectDeps) {
    const executables = rootProjectDep.getExecutables();
    for (const name of Object.keys(executables)) {
      const srcPath = executables[name];

      // existing logic from lerna -- ensure that the bin we are going to
      // point to exists or ignore it
      if (!(await isFile(srcPath))) {
        continue;
      }

      const dest = resolve(rootBinsDir, name);

      // Get relative project path with normalized path separators.
      const rootProjectRelativePath = relative(rootProject.path, srcPath).split(sep).join('/');

      log.debug(`[${rootProject.name}] ${name} -> ${rootProjectRelativePath}`);

      await mkdirp(dirname(dest));
      await createSymlink(srcPath, dest, 'exec');
      await chmod(dest, '755');
    }
  }
}
