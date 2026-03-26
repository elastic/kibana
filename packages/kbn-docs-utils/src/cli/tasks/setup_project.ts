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
    // Full build: load all source files and resolve dependencies upfront
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/plugins/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/packages/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/platform/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/x-pack/solutions/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/src/plugins/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/src/platform/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/src/core/packages/**/*.ts`, '!**/*.d.ts']);
    project.addSourceFilesAtPaths([`${repoPath}/packages/**/*.ts`, '!**/*.d.ts']);
    project.resolveSourceFileDependencies();
  } else {
    // Single-plugin build: only load files from the target plugin directory.
    // We intentionally skip resolveSourceFileDependencies() here because:
    // 1. ts-morph resolves dependencies lazily when accessed (e.g., via getType()).
    // 2. This significantly reduces memory usage and startup time for single-plugin builds.
    // 3. Cross-package type references still resolve correctly via the tsconfig paths.
    // Trade-off: First access to external types may be slightly slower, but overall
    // build time is reduced since we don't load the entire codebase into memory.
    project.addSourceFilesAtPaths([`${overridePath}/**/*.ts`, '!**/*.d.ts']);
  }
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

  const { pluginFilter, packageFilter } = options;
  const hasPluginFilter = pluginFilter && pluginFilter.length > 0;
  const hasPackageFilter = packageFilter && packageFilter.length > 0;
  const hasAnyFilter = hasPluginFilter || hasPackageFilter;

  const spanInitialDocIds = transaction.startSpan('build_api_docs.initialDocIds', 'setup');
  const initialDocIds =
    !hasAnyFilter && Fs.existsSync(outputFolder) ? await getAllDocFileIds(outputFolder) : undefined;
  spanInitialDocIds?.end();

  const spanPlugins = transaction.startSpan('build_api_docs.findPlugins', 'setup');
  // Always find all plugins for cross-reference resolution.
  const allPlugins = findPlugins();
  // Find filtered plugins if a filter is provided.
  const filteredPlugins = hasAnyFilter ? findPlugins({ pluginFilter, packageFilter }) : allPlugins;

  // Validate that all requested plugins were found.
  if (hasPluginFilter && pluginFilter) {
    const foundPluginIds = filteredPlugins.filter((p) => p.isPlugin).map((p) => p.id);
    const missingPlugins = pluginFilter.filter((id) => !foundPluginIds.includes(id));
    if (missingPlugins.length > 0) {
      throw createFlagError(`expected --plugin '${missingPlugins.join(', ')}' was not found`);
    }
  }

  // Validate that all requested packages were found.
  if (hasPackageFilter && packageFilter) {
    const foundPackageIds = filteredPlugins.filter((p) => !p.isPlugin).map((p) => p.id);
    const missingPackages = packageFilter.filter((id) => !foundPackageIds.includes(id));
    if (missingPackages.length > 0) {
      throw createFlagError(`expected --package '${missingPackages.join(', ')}' was not found`);
    }
  }

  // Use filtered plugins for iteration, all plugins for reference resolution
  const plugins = hasAnyFilter ? filteredPlugins : allPlugins;
  spanPlugins?.end();

  const spanPathsByPackage = transaction.startSpan('build_api_docs.getPathsByPackage', 'setup');
  const pathsByPlugin = await getPathsByPackage(plugins);
  spanPathsByPackage?.end();

  const spanProject = transaction.startSpan('build_api_docs.getTsProject', 'setup');
  // Optimize: when building a single plugin/package, scope the TS project to just that directory
  const singlePluginDirectory =
    hasAnyFilter && filteredPlugins.length === 1 ? filteredPlugins[0].directory : undefined;
  const project = getTsProject(REPO_ROOT, singlePluginDirectory);
  spanProject?.end();

  const spanFolders = transaction.startSpan('build_api_docs.check-folders', 'setup');
  // if the output folder already exists, and we don't have a filter, delete all the files in the output folder
  if (Fs.existsSync(outputFolder) && !hasAnyFilter) {
    await Fsp.rm(outputFolder, { recursive: true });
  }

  // if the output folder doesn't exist, create it
  if (!Fs.existsSync(outputFolder)) {
    await Fsp.mkdir(outputFolder, { recursive: true });
  }
  spanFolders?.end();

  return {
    plugins,
    allPlugins,
    pathsByPlugin,
    project,
    initialDocIds,
  };
}
