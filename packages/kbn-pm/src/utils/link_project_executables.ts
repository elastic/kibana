/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
