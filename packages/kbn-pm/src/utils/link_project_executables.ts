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

import { chmod, createSymlink, isFile, isDirectory, mkdirp, rmdirp } from './fs';
import { log } from './log';
import { ProjectGraph, ProjectMap } from './projects';

/**
 * Yarn does not link the executables from dependencies that are installed
 * using `link:` https://github.com/yarnpkg/yarn/pull/5046
 *
 * Additionally while we have a single package.json being used to install dependencies
 * in the root project, we also want to be able to run npm scripts in the underlying projects.
 * We simulate this functionality by finding the root project and for the root project walking through each
 * dependency and manually link its executables if any defined.
 * Finally we walk through each other project (excluding the root) and we just symlink each project's
 * node_modules/.bin into the root node_modules/.bin
 *
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

  // Assure roots bin dir exists
  if (!(await isDirectory(rootBinsDir))) {
    await mkdirp(rootBinsDir);
  }

  // Create symlinks to rootProject/node_modules/.bin for every other project
  const kibanaProjectPath = projectsByName.get('kibana')?.path;
  for (const [projectName] of projectGraph) {
    const project = projectsByName.get(projectName)!;
    const isExternalPlugin = project.path.includes(`${kibanaProjectPath}${sep}plugins`);

    if (project.isSinglePackageJsonProject || isExternalPlugin) {
      continue;
    }

    const srcPath = rootBinsDir;
    const dest = resolve(project.nodeModulesLocation, '.bin');

    // Get relative project path with normalized path separators.
    const projectRelativePath = relative(project.path, srcPath).split(sep).join('/');

    log.debug(`[${project.name}] 'node_modules/.bin' -> ${projectRelativePath}`);

    await rmdirp(dirname(dest));
    await mkdirp(dirname(dest));
    await createSymlink(srcPath, dest, 'dir');
    await chmod(dest, '755');
  }
}
