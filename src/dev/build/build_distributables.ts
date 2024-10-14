/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import { Config, createRunner, Task, GlobalTask } from './lib';
import * as Tasks from './tasks';

export interface BuildOptions {
  isRelease: boolean;
  dockerContextUseLocalArtifact: boolean | null;
  dockerCrossCompile: boolean;
  dockerNamespace: string | null;
  dockerPush: boolean;
  dockerTag: string | null;
  dockerTagQualifier: string | null;
  downloadFreshNode: boolean;
  downloadCloudDependencies: boolean;
  initialize: boolean;
  buildCanvasShareableRuntime: boolean;
  createGenericFolders: boolean;
  createPlatformFolders: boolean;
  createArchives: boolean;
  createCdnAssets: boolean;
  createRpmPackage: boolean;
  createDebPackage: boolean;
  createDockerUBI: boolean;
  createDockerUbuntu: boolean;
  createDockerWolfi: boolean;
  createDockerCloud: boolean;
  createDockerServerless: boolean;
  createDockerContexts: boolean;
  createDockerFIPS: boolean;
  versionQualifier: string | undefined;
  targetAllPlatforms: boolean;
  targetServerlessPlatforms: boolean;
  withExamplePlugins: boolean;
  withTestPlugins: boolean;
  eprRegistry: 'production' | 'snapshot';
}

export async function buildDistributables(log: ToolingLog, options: BuildOptions): Promise<void> {
  log.verbose('building distributables with options:', options);

  const config = await Config.create(options);

  const run: (task: Task | GlobalTask) => Promise<void> = createRunner({
    config,
    log,
  });

  /**
   * verify, reset, and initialize the build environment
   */
  if (options.initialize) {
    await run(Tasks.VerifyEnv);
    await run(Tasks.Clean);
    await run(
      options.downloadFreshNode ? Tasks.DownloadNodeBuilds : Tasks.VerifyExistingNodeBuilds
    );
    await run(Tasks.ExtractNodeBuilds);
  }

  /**
   * run platform-generic build tasks
   */
  if (options.createGenericFolders) {
    // Build before copying source files
    if (options.buildCanvasShareableRuntime) {
      await run(Tasks.BuildCanvasShareableRuntime);
    }

    await run(Tasks.CopyLegacySource);

    await run(Tasks.CreateEmptyDirsAndFiles);
    await run(Tasks.CreateReadme);
    await run(Tasks.BuildPackages);
    await run(Tasks.ReplaceFavicon);
    await run(Tasks.BuildKibanaPlatformPlugins);
    await run(Tasks.CreatePackageJson);
    await run(Tasks.InstallDependencies);
    await run(Tasks.GeneratePackagesOptimizedAssets);

    // Run on all source files
    // **/packages need to be read
    // before DeletePackagesFromBuildRoot
    await run(Tasks.CreateNoticeFile);
    await run(Tasks.CreateXPackNoticeFile);

    await run(Tasks.DeletePackagesFromBuildRoot);
    await run(Tasks.UpdateLicenseFile);
    await run(Tasks.RemovePackageJsonDeps);
    await run(Tasks.CleanPackageManagerRelatedFiles);
    await run(Tasks.CleanExtraFilesFromModules);
    await run(Tasks.CleanEmptyFolders);
    await run(Tasks.FetchAgentVersionsList);
  }

  /**
   * copy generic build outputs into platform-specific build
   * directories and perform platform/architecture-specific steps
   */
  if (options.createPlatformFolders) {
    await run(Tasks.CreateArchivesSources);
    await run(Tasks.InstallChromium);
    await run(Tasks.CopyBinScripts);
    await run(Tasks.CleanNodeBuilds);

    await run(Tasks.AssertFileTime);
    await run(Tasks.AssertPathLength);
    await run(Tasks.AssertNoUUID);
  }
  // control w/ --skip-cdn-assets
  if (options.createCdnAssets) {
    await run(Tasks.CreateCdnAssets);
  }

  /**
   * package platform-specific builds into archives
   * or os-specific packages in the target directory
   */
  if (options.createArchives) {
    // control w/ --skip-archives
    await run(Tasks.CreateArchives);
  }

  if (options.createDebPackage || options.createRpmPackage) {
    await run(Tasks.CreatePackageConfig);
  }
  if (options.createDebPackage) {
    // control w/ --deb or --skip-os-packages
    await run(Tasks.CreateDebPackage);
  }
  if (options.createRpmPackage) {
    // control w/ --rpm or --skip-os-packages
    await run(Tasks.CreateRpmPackage);
  }
  if (options.createDockerUBI) {
    // control w/ --docker-images or --skip-docker-ubi or --skip-os-packages
    await run(Tasks.CreateDockerUBI);
  }

  if (options.createDockerUbuntu) {
    // control w/ --docker-images or --skip-docker-ubuntu or --skip-os-packages
    await run(Tasks.CreateDockerUbuntu);
  }

  if (options.createDockerWolfi) {
    // control w/ --docker-images or --skip-docker-wolfi or --skip-os-packages
    await run(Tasks.CreateDockerWolfi);
  }
  if (options.createDockerCloud) {
    // control w/ --docker-images and --skip-docker-cloud
    if (options.downloadCloudDependencies) {
      // control w/ --skip-cloud-dependencies-download
      await run(Tasks.DownloadCloudDependencies);
    }
    await run(Tasks.CreateDockerCloud);
  }

  if (options.createDockerServerless) {
    // control w/ --docker-images and --skip-docker-serverless
    await run(Tasks.CreateDockerServerless);
  }

  if (options.createDockerFIPS) {
    // control w/ --docker-images or --skip-docker-fips or --skip-os-packages
    await run(Tasks.CreateDockerFIPS);
  }

  if (options.createDockerContexts) {
    // control w/ --skip-docker-contexts
    await run(Tasks.CreateDockerContexts);
  }

  /**
   * finalize artifacts by writing sha1sums of each into the target directory
   */
  await run(Tasks.WriteShaSums);
}
