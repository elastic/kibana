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

import copy from 'cpy';
import del from 'del';
import { join, relative, resolve } from 'path';

import { getProjectPaths } from '../config';
import { isDirectory, isFile } from '../utils/fs';
import { log } from '../utils/log';
import { readPackageJson, writePackageJson } from '../utils/package_json';
import { Project } from '../utils/project';
import {
  buildProjectGraph,
  getProjects,
  includeTransitiveProjects,
  topologicallyBatchProjects,
} from '../utils/projects';

export async function buildProductionProjects({
  kibanaRoot,
  buildRoot,
  onlyOSS,
}: {
  kibanaRoot: string;
  buildRoot: string;
  onlyOSS?: boolean;
}) {
  const projects = await getProductionProjects(kibanaRoot, onlyOSS);
  const projectGraph = buildProjectGraph(projects);
  const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

  const projectNames = [...projects.values()].map(project => project.name);
  log.write(`Preparing production build for [${projectNames.join(', ')}]`);

  for (const batch of batchedProjects) {
    for (const project of batch) {
      await deleteTarget(project);
      await buildProject(project);
      await copyToBuild(project, kibanaRoot, buildRoot);
    }
  }
}

/**
 * Returns the subset of projects that should be built into the production
 * bundle. As we copy these into Kibana's `node_modules` during the build step,
 * and let Kibana's build process be responsible for installing dependencies,
 * we only include Kibana's transitive _production_ dependencies. If onlyOSS
 * is supplied, we omit projects with build.oss in their package.json set to false.
 */
async function getProductionProjects(rootPath: string, onlyOSS?: boolean) {
  const projectPaths = getProjectPaths({ rootPath });
  const projects = await getProjects(rootPath, projectPaths);
  const projectsSubset = [projects.get('kibana')!];

  if (projects.has('x-pack')) {
    projectsSubset.push(projects.get('x-pack')!);
  }

  const productionProjects = includeTransitiveProjects(projectsSubset, projects, {
    onlyProductionDependencies: true,
  });

  // We remove Kibana, as we're already building Kibana
  productionProjects.delete('kibana');

  if (onlyOSS) {
    productionProjects.forEach(project => {
      if (project.getBuildConfig().oss === false) {
        productionProjects.delete(project.json.name);
      }
    });
  }

  return productionProjects;
}

async function deleteTarget(project: Project) {
  const targetDir = project.targetLocation;

  if (await isDirectory(targetDir)) {
    await del(targetDir, { force: true });
  }
}

async function buildProject(project: Project) {
  if (project.hasScript('build')) {
    await project.runScript('build');
  }
}

/**
 * Copy all the project's files from its "intermediate build directory" and
 * into the build. The intermediate directory can either be the root of the
 * project or some other location defined in the project's `package.json`.
 *
 * When copying all the files into the build, we exclude `node_modules` because
 * we want the Kibana build to be responsible for actually installing all
 * dependencies. The primary reason for allowing the Kibana build process to
 * manage dependencies is that it will "dedupe" them, so we don't include
 * unnecessary copies of dependencies.
 */
async function copyToBuild(project: Project, kibanaRoot: string, buildRoot: string) {
  // We want the package to have the same relative location within the build
  const relativeProjectPath = relative(kibanaRoot, project.path);
  const buildProjectPath = resolve(buildRoot, relativeProjectPath);

  await copy(['**/*', '!node_modules/**'], buildProjectPath, {
    cwd: project.getIntermediateBuildDirectory(),
    dot: true,
    nodir: true,
    parents: true,
  });

  // If a project is using an intermediate build directory, we special-case our
  // handling of `package.json`, as the project build process might have copied
  // (a potentially modified) `package.json` into the intermediate build
  // directory already. If so, we want to use that `package.json` as the basis
  // for creating the production-ready `package.json`. If it's not present in
  // the intermediate build, we fall back to using the project's already defined
  // `package.json`.
  const packageJson = (await isFile(join(buildProjectPath, 'package.json')))
    ? await readPackageJson(buildProjectPath)
    : project.json;

  await writePackageJson(buildProjectPath, packageJson);
}
