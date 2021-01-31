/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import copy from 'cpy';
import { join, relative, resolve } from 'path';

import { buildProject, getProductionProjects } from './build_non_bazel_production_projects';
import { isFile } from '../utils/fs';
import { log } from '../utils/log';
import {
  createProductionPackageJson,
  readPackageJson,
  writePackageJson,
} from '../utils/package_json';
import { getBazelProjectsOnly } from '../utils/projects';
import { Project } from '..';

export async function buildBazelProductionProjects({
  kibanaRoot,
  buildRoot,
  onlyOSS,
}: {
  kibanaRoot: string;
  buildRoot: string;
  onlyOSS?: boolean;
}) {
  const projects = await getBazelProjectsOnly(await getProductionProjects(kibanaRoot, onlyOSS));

  const projectNames = [...projects.values()].map((project) => project.name);
  log.info(`Preparing Bazel projects production build for [${projectNames.join(', ')}]`);

  for (const project of projects.values()) {
    await buildProject(project);
    await copyToBuild(project, kibanaRoot, buildRoot);
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
    onlyFiles: true,
    parents: true,
  } as copy.Options);

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

  const preparedPackageJson = createProductionPackageJson(packageJson);
  await writePackageJson(buildProjectPath, preparedPackageJson);
}
