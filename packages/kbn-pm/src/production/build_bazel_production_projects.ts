/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import copy from 'cpy';
import globby from 'globby';
import { basename, join, relative, resolve } from 'path';

import { getProductionProjects } from './build_non_bazel_production_projects';
import { runBazel } from '../utils/bazel';
import { chmod, isFile, isDirectory } from '../utils/fs';
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

  await runBazel(['build', '//packages:build']);
  log.info(`All Bazel projects production builds for [${projectNames.join(', ')}] are complete`);

  for (const project of projects.values()) {
    await copyToBuild(project, kibanaRoot, buildRoot);
    await applyCorrectPermissions(project, kibanaRoot, buildRoot);
  }
}

/**
 * Copy all the project's files from its Bazel dist directory into the
 * project build folder.
 *
 * When copying all the files into the build, we exclude `node_modules` because
 * we want the Kibana build to be responsible for actually installing all
 * dependencies. The primary reason for allowing the Kibana build process to
 * manage dependencies is that it will "dedupe" them, so we don't include
 * unnecessary copies of dependencies. We also exclude every related Bazel build
 * files in order to get the most cleaner package module we can in the final distributable.
 */
async function copyToBuild(project: Project, kibanaRoot: string, buildRoot: string) {
  // We want the package to have the same relative location within the build
  const relativeProjectPath = relative(kibanaRoot, project.path);
  const buildProjectPath = resolve(buildRoot, relativeProjectPath);

  await copy(['**/*'], buildProjectPath, {
    cwd: join(kibanaRoot, 'bazel-bin', 'packages', basename(buildProjectPath), 'npm_module'),
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

async function applyCorrectPermissions(project: Project, kibanaRoot: string, buildRoot: string) {
  const relativeProjectPath = relative(kibanaRoot, project.path);
  const buildProjectPath = resolve(buildRoot, relativeProjectPath);
  const allPluginPaths = await globby([`**/*`], {
    onlyFiles: false,
    cwd: buildProjectPath,
    dot: true,
  });

  for (const pluginPath of allPluginPaths) {
    const resolvedPluginPath = resolve(buildProjectPath, pluginPath);
    if (await isFile(resolvedPluginPath)) {
      await chmod(resolvedPluginPath, 0o644);
    }

    if (await isDirectory(resolvedPluginPath)) {
      await chmod(resolvedPluginPath, 0o755);
    }
  }
}
