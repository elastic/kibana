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
  createDockerPackage: boolean;
  createDockerUbiPackage: boolean;
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
  if (options.createDockerPackage) {
    // control w/ --docker or --skip-docker-ubi or --skip-os-packages
    await run(Tasks.CreateDockerPackage);
    if (options.createDockerUbiPackage) {
      await run(Tasks.CreateDockerUbiPackage);
    }
  }

  /**
   * finalize artifacts by writing sha1sums of each into the target directory
   */
  await run(Tasks.WriteShaSums);
}
