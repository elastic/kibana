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

import globSync from 'glob';
import path from 'path';
import { promisify } from 'util';

import { getProjectPaths } from '../config';
import { copyDirectory, isSymlink, unlink } from './fs';
import { readPackageJson } from './package_json';
import { getProjects } from './projects';

const glob = promisify(globSync);

export async function workspacePackagePaths(rootPath: string): Promise<string[]> {
  const rootPkgJson = await readPackageJson(path.join(rootPath, 'package.json'));

  if (!rootPkgJson.workspaces) {
    return [];
  }

  const workspacesPathsPatterns: string[] = rootPkgJson.workspaces.packages;
  let workspaceProjectsPaths: string[] = [];

  for (const pattern of workspacesPathsPatterns) {
    workspaceProjectsPaths = workspaceProjectsPaths.concat(
      await packagesFromGlobPattern({ pattern, rootPath })
    );
  }

  // Filter out exclude glob patterns
  for (const pattern of workspacesPathsPatterns) {
    if (pattern.startsWith('!')) {
      const pathToRemove = path.join(rootPath, pattern.slice(1), 'package.json');
      workspaceProjectsPaths = workspaceProjectsPaths.filter(p => p !== pathToRemove);
    }
  }

  return workspaceProjectsPaths;
}

export async function copyWorkspacePackages(rootPath: string): Promise<void> {
  const projectPaths = getProjectPaths(rootPath, {});
  const projects = await getProjects(rootPath, projectPaths);

  for (const project of projects.values()) {
    const dest = path.resolve(rootPath, 'node_modules', project.name);

    if ((await isSymlink(dest)) === false) {
      continue;
    }

    // Remove the symlink
    await unlink(dest);

    // Copy in the package
    await copyDirectory(project.path, dest);
  }
}

function packagesFromGlobPattern({ pattern, rootPath }: { pattern: string; rootPath: string }) {
  const globOptions = {
    cwd: rootPath,

    // Should throw in case of unusual errors when reading the file system
    strict: true,

    // Always returns absolute paths for matched files
    absolute: true,

    // Do not match ** against multiple filenames
    // (This is only specified because we currently don't have a need for it.)
    noglobstar: true,
  };

  return glob(path.join(pattern, 'package.json'), globOptions);
}
