/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { Config, createRunner, Task, GlobalTask } from './lib';
import * as Tasks from './tasks';

export interface BuildOptions {
  isRelease: boolean;
  dockerContextUseLocalArtifact: boolean | null;
  dockerCrossCompile: boolean;
  dockerPush: boolean;
  dockerTagQualifier: string | null;
  downloadFreshNode: boolean;
  downloadCloudDependencies: boolean;
  initialize: boolean;
  createGenericFolders: boolean;
  createPlatformFolders: boolean;
  createArchives: boolean;
  createRpmPackage: boolean;
  createDebPackage: boolean;
  createDockerUBI: boolean;
  createDockerUbuntu: boolean;
  createDockerCloud: boolean;
  createDockerContexts: boolean;
  versionQualifier: string | undefined;
  targetAllPlatforms: boolean;
  createExamplePlugins: boolean;
  eprRegistry: 'production' | 'snapshot';
}

export async function buildDistributables(log: ToolingLog, options: BuildOptions): Promise<void> {
  log.verbose('building distributables with options:', options);

  const config: Config = await Config.create(options);

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
   * build example plugins
   */
  if (options.createExamplePlugins) {
    await run(Tasks.BuildKibanaExamplePlugins);
  }

  /**
   * run platform-generic build tasks
   */
  if (options.createGenericFolders) {
    await run(Tasks.CopySource);
    await run(Tasks.CopyBinScripts);
    await run(Tasks.ReplaceFavicon);
    await run(Tasks.CreateEmptyDirsAndFiles);
    await run(Tasks.CreateReadme);
    await run(Tasks.BuildBazelPackages);
    await run(Tasks.BuildXpack);
    await run(Tasks.BuildKibanaPlatformPlugins);
    await run(Tasks.TranspileBabel);
    await run(Tasks.CreatePackageJson);
    await run(Tasks.InstallDependencies);
    await run(Tasks.GeneratePackagesOptimizedAssets);
    await run(Tasks.CleanPackages);
    await run(Tasks.CreateNoticeFile);
    await run(Tasks.UpdateLicenseFile);
    await run(Tasks.RemovePackageJsonDeps);
    await run(Tasks.CleanTypescript);
    await run(Tasks.CleanExtraFilesFromModules);
    await run(Tasks.CleanEmptyFolders);
    await run(Tasks.BundleFleetPackages);
  }

  /**
   * copy generic build outputs into platform-specific build
   * directories and perform platform/architecture-specific steps
   */
  if (options.createPlatformFolders) {
    await run(Tasks.CreateArchivesSources);
    await run(Tasks.PatchNativeModules);
    await run(Tasks.InstallChromium);
    await run(Tasks.CleanExtraBinScripts);
    await run(Tasks.CleanNodeBuilds);

    await run(Tasks.PathLength);
    await run(Tasks.UuidVerification);
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

  if (options.createDockerCloud) {
    // control w/ --docker-images and --skip-docker-cloud
    if (options.downloadCloudDependencies) {
      // control w/ --skip-cloud-dependencies-download
      await run(Tasks.DownloadCloudDependencies);
    }
    await run(Tasks.CreateDockerCloud);
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
