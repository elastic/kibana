/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import { Project } from 'ts-morph';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFlagError } from '@kbn/dev-cli-errors';
import { findPlugins } from '../../find_plugins';
import { getPathsByPackage } from '../../get_paths_by_package';
import { getAllDocFileIds } from '../../mdx/get_all_doc_file_ids';
import type { CliContext, CliOptions, SetupProjectResult } from '../types';

/**
 * Creates a TypeScript project for parsing and analyzing TypeScript files.
 *
 * @param repoPath - Root path of the repository.
 * @param overridePath - Optional override path for a specific plugin directory.
 * @returns Configured TypeScript project.
 */
function getTsProject(repoPath: string, overridePath?: string): Project {
  const xpackTsConfig = !overridePath
    ? `${repoPath}/tsconfig.json`
    : `${overridePath}/tsconfig.json`;

  const project = new Project({
    tsConfigFilePath: xpackTsConfig,
    // We'll use the files added below instead.
    skipAddingFilesFromTsConfig: true,
  });

  if (!overridePath) {
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/plugins/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/packages/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/platform/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/solutions/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/src/plugins/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/src/platform/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/src/core/packages/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/packages/**/*.ts`, '!**/*.d.ts']);
  } else {
    project.addSourceFilesAtPaths([`${overridePath}/**/*.ts`, '!**/*.d.ts']);
  }
  project.resolveSourceFileDependencies();
  return project;
}

/**
 * Sets up the project for API documentation generation.
 *
 * This task handles:
 * - Validating plugin filters
 * - Discovering plugins and packages
 * - Resolving file paths by package
 * - Creating the TypeScript project
 * - Setting up the output folder
 * - Collecting initial document IDs for cleanup
 *
 * @param context - CLI context with log, transaction, and output folder.
 * @param options - Parsed CLI options.
 * @returns Setup result with plugins, paths, and TypeScript project.
 * @throws {Error} If plugin filter validation fails.
 */
export async function setupProject(
  context: CliContext,
  options: CliOptions
): Promise<SetupProjectResult> {
  const { transaction, outputFolder } = context;

  const spanInitialDocIds = transaction.startSpan('build_api_docs.initialDocIds', 'setup');
  const initialDocIds =
    !options.pluginFilter && Fs.existsSync(outputFolder)
      ? await getAllDocFileIds(outputFolder)
      : undefined;
  spanInitialDocIds?.end();

  const spanPlugins = transaction.startSpan('build_api_docs.findPlugins', 'setup');
  const plugins = findPlugins(
    options.stats && options.pluginFilter ? options.pluginFilter : undefined
  );

  if (
    options.stats &&
    Array.isArray(options.pluginFilter) &&
    options.pluginFilter.length !== plugins.length
  ) {
    throw createFlagError('expected --plugin was not found');
  }
  spanPlugins?.end();

  const spanPathsByPackage = transaction.startSpan('build_api_docs.getPathsByPackage', 'setup');
  const pathsByPlugin = await getPathsByPackage(plugins);
  spanPathsByPackage?.end();

  const spanProject = transaction.startSpan('build_api_docs.getTsProject', 'setup');
  const project = getTsProject(
    REPO_ROOT,
    options.stats && options.pluginFilter && plugins.length === 1 ? plugins[0].directory : undefined
  );
  spanProject?.end();

  const spanFolders = transaction.startSpan('build_api_docs.check-folders', 'setup');
  // if the output folder already exists, and we don't have a plugin filter, delete all the files in the output folder
  if (Fs.existsSync(outputFolder) && !options.pluginFilter) {
    await Fsp.rm(outputFolder, { recursive: true });
  }

  // if the output folder doesn't exist, create it
  if (!Fs.existsSync(outputFolder)) {
    await Fsp.mkdir(outputFolder, { recursive: true });
  }
  spanFolders?.end();

  return {
    plugins,
    pathsByPlugin,
    project,
    initialDocIds,
  };
}
