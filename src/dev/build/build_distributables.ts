/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';

import { Config, createRunner } from './lib';
import * as Tasks from './tasks';

export interface BuildOptions {
  isRelease: boolean;
  buildOssDist: boolean;
  buildDefaultDist: boolean;
  downloadFreshNode: boolean;
  createArchives: boolean;
  createRpmPackage: boolean;
  createDebPackage: boolean;
  createDockerUBI: boolean;
  createDockerCentOS: boolean;
  createDockerContexts: boolean;
  versionQualifier: string | undefined;
  targetAllPlatforms: boolean;
}

export async function buildDistributables(log: ToolingLog, options: BuildOptions) {
  log.verbose('building distributables with options:', options);

  const config = await Config.create(options);

  const run = createRunner({
    config,
    log,
    buildDefaultDist: options.buildDefaultDist,
    buildOssDist: options.buildOssDist,
  });

  /**
   * verify, reset, and initialize the build environment
   */
  await run(Tasks.VerifyEnv);
  await run(Tasks.Clean);
  await run(options.downloadFreshNode ? Tasks.DownloadNodeBuilds : Tasks.VerifyExistingNodeBuilds);
  await run(Tasks.ExtractNodeBuilds);

  /**
   * run platform-generic build tasks
   */
  await run(Tasks.CopySource);
  await run(Tasks.CopyBinScripts);
  await run(Tasks.ReplaceFavicon);
  await run(Tasks.CreateEmptyDirsAndFiles);
  await run(Tasks.CreateReadme);
  await run(Tasks.BuildPackages);
  await run(Tasks.BuildKibanaPlatformPlugins);
  await run(Tasks.TranspileBabel);
  await run(Tasks.CreatePackageJson);
  await run(Tasks.InstallDependencies);
  await run(Tasks.CleanPackages);
  await run(Tasks.CreateNoticeFile);
  await run(Tasks.UpdateLicenseFile);
  await run(Tasks.RemovePackageJsonDeps);
  await run(Tasks.CleanTypescript);
  await run(Tasks.CleanExtraFilesFromModules);
  await run(Tasks.CleanEmptyFolders);

  /**
   * copy generic build outputs into platform-specific build
   * directories and perform platform/architecture-specific steps
   */
  await run(Tasks.CreateArchivesSources);
  await run(Tasks.PatchNativeModules);
  await run(Tasks.InstallChromium);
  await run(Tasks.CleanExtraBinScripts);
  await run(Tasks.CleanNodeBuilds);

  await run(Tasks.PathLength);
  await run(Tasks.UuidVerification);

  /**
   * package platform-specific builds into archives
   * or os-specific packages in the target directory
   */
  if (options.createArchives) {
    // control w/ --skip-archives
    await run(Tasks.CreateArchives);
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

  if (options.createDockerCentOS) {
    // control w/ --docker-images or --skip-docker-centos or --skip-os-packages
    await run(Tasks.CreateDockerCentOS);
  }

  if (options.createDockerContexts) {
    // control w/ --docker-contexts or --skip-os-packages
    await run(Tasks.CreateDockerContexts);
  }

  /**
   * finalize artifacts by writing sha1sums of each into the target directory
   */
  await run(Tasks.WriteShaSums);
}
