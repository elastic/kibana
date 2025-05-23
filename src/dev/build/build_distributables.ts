/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import { Config, createRunner } from './lib';
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
  createDockerWolfi: boolean;
  createDockerCloud: boolean;
  createDockerCloudFIPS: boolean;
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

  log.write('--- Running global Kibana build tasks');

  const config = await Config.create(options);
  const globalRun = createRunner({ config, log });
  const artifactTasks = [];

  /**
   * verify, reset, and initialize the build environment
   */
  if (options.initialize) {
    await globalRun(Tasks.VerifyEnv);
    await globalRun(Tasks.Clean);
    await globalRun(
      options.downloadFreshNode ? Tasks.DownloadNodeBuilds : Tasks.VerifyExistingNodeBuilds
    );
    await globalRun(Tasks.ExtractNodeBuilds);
  }

  /**
   * run platform-generic build tasks
   */
  if (options.createGenericFolders) {
    // Build before copying source files
    if (options.buildCanvasShareableRuntime) {
      await globalRun(Tasks.BuildCanvasShareableRuntime);
    }

    await globalRun(Tasks.CopyLegacySource);

    await globalRun(Tasks.CreateEmptyDirsAndFiles);
    await globalRun(Tasks.CreateReadme);
    await globalRun(Tasks.BuildPackages);
    await globalRun(Tasks.ReplaceFavicon);
    await globalRun(Tasks.BuildKibanaPlatformPlugins);
    await globalRun(Tasks.CreatePackageJson);
    await globalRun(Tasks.InstallDependencies);
    await globalRun(Tasks.GeneratePackagesOptimizedAssets);

    // Run on all source files
    // **/packages need to be read
    // before DeletePackagesFromBuildRoot
    await globalRun(Tasks.CreateNoticeFile);
    await globalRun(Tasks.CreateXPackNoticeFile);

    await globalRun(Tasks.DeletePackagesFromBuildRoot);
    await globalRun(Tasks.UpdateLicenseFile);
    await globalRun(Tasks.RemovePackageJsonDeps);
    await globalRun(Tasks.CleanPackageManagerRelatedFiles);
    await globalRun(Tasks.CleanExtraFilesFromModules);
    await globalRun(Tasks.CleanEmptyFolders);
    await globalRun(Tasks.FetchAgentVersionsList);
  }

  /**
   * copy generic build outputs into platform-specific build
   * directories and perform platform/architecture-specific steps
   */
  if (options.createPlatformFolders) {
    await globalRun(Tasks.CreateArchivesSources);
    await globalRun(Tasks.InstallChromium);
    await globalRun(Tasks.CopyBinScripts);
    await globalRun(Tasks.CleanNodeBuilds);

    await globalRun(Tasks.AssertFileTime);
    await globalRun(Tasks.AssertPathLength);
    await globalRun(Tasks.AssertNoUUID);
  }
  // control w/ --skip-cdn-assets
  if (options.createCdnAssets) {
    await globalRun(Tasks.CreateCdnAssets);
  }

  /**
   * package platform-specific builds into archives
   * or os-specific packages in the target directory
   */
  if (options.createArchives) {
    // control w/ --skip-archives
    await globalRun(Tasks.CreateArchives);
  }

  if (
    options.downloadCloudDependencies &&
    (options.createDockerCloud || options.createDockerCloudFIPS)
  ) {
    // control w/ --skip-cloud-dependencies-download
    await globalRun(Tasks.DownloadCloudDependencies);
  }

  if (options.createDebPackage || options.createRpmPackage) {
    await globalRun(Tasks.CreatePackageConfig);

    if (options.createDebPackage) {
      // control w/ --deb or --skip-os-packages
      artifactTasks.push(Tasks.CreateDebPackage);
    }
    if (options.createRpmPackage) {
      // control w/ --rpm or --skip-os-packages
      artifactTasks.push(Tasks.CreateRpmPackage);
    }
  }

  if (options.createDockerUBI) {
    // control w/ --docker-images or --skip-docker-ubi or --skip-os-packages
    artifactTasks.push(Tasks.CreateDockerUBI);
  }

  if (options.createDockerWolfi) {
    // control w/ --docker-images or --skip-docker-wolfi or --skip-os-packages
    artifactTasks.push(Tasks.CreateDockerWolfi);
  }

  if (options.createDockerCloud) {
    // control w/ --docker-images and --skip-docker-cloud
    artifactTasks.push(Tasks.CreateDockerCloud);
  }

  if (options.createDockerServerless) {
    // control w/ --docker-images and --skip-docker-serverless
    artifactTasks.push(Tasks.CreateDockerServerless);
  }

  if (options.createDockerFIPS) {
    // control w/ --docker-images or --skip-docker-fips or --skip-os-packages
    artifactTasks.push(Tasks.CreateDockerFIPS);
  }

  if (options.createDockerCloudFIPS) {
    // control w/ --docker-images and --skip-docker-cloud-fips
    artifactTasks.push(Tasks.CreateDockerCloudFIPS);
  }

  if (options.createDockerContexts) {
    // control w/ --skip-docker-contexts
    artifactTasks.push(Tasks.CreateDockerContexts);
  }

  await Promise.allSettled(
    // createRunner for each task to ensure each task gets its own Build instance
    artifactTasks.map(async (task) => await createRunner({ config, log, bufferLogs: true })(task))
  );

  /**
   * finalize artifacts by writing sha1sums of each into the target directory
   */
  log.write('--- Finalizing Kibana artifacts');
  await globalRun(Tasks.WriteShaSums);
}
