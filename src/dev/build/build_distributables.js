import { getConfig, createRunner } from './lib';

import {
  BootstrapTask,
  BuildPackagesTask,
  CleanExtraBinScriptsTask,
  CleanExtraBrowsersTask,
  CleanExtraFilesFromModulesTask,
  CleanPackagesTask,
  CleanTask,
  CopySourceTask,
  CreateArchivesSourcesTask,
  CreateArchivesTask,
  CreateDebPackageTask,
  CreateEmptyDirsAndFilesTask,
  CreateNoticeFileTask,
  CreatePackageJsonTask,
  CreateReadmeTask,
  CreateRpmPackageTask,
  DownloadNodeBuildsTask,
  ExtractNodeBuildsTask,
  InstallDependenciesTask,
  OptimizeBuildTask,
  RemovePackageJsonDepsTask,
  TranspileSourceTask,
  UpdateLicenseFileTask,
  VerifyEnvTask,
  VerifyExistingNodeBuildsTask,
  WriteShaSumsTask,
} from './tasks';

export async function buildDistributables(options) {
  const {
    log,
    isRelease,
    buildOssDist,
    buildDefaultDist,
    downloadFreshNode,
    createArchives,
    createRpmPackage,
    createDebPackage,
  } = options;

  log.verbose('building distributables with options:', {
    isRelease,
    buildOssDist,
    buildDefaultDist,
    downloadFreshNode,
    createArchives,
    createRpmPackage,
    createDebPackage,
  });

  const config = await getConfig({
    isRelease,
  });

  const run = createRunner({
    config,
    log,
    buildOssDist,
    buildDefaultDist,
  });

  /**
   * verify, reset, and initialize the build environment
   */
  await run(VerifyEnvTask);
  await run(CleanTask);
  await run(BootstrapTask);
  await run(downloadFreshNode ? DownloadNodeBuildsTask : VerifyExistingNodeBuildsTask);
  await run(ExtractNodeBuildsTask);

  /**
   * run platform-generic build tasks
   */
  await run(CopySourceTask);
  await run(CreateEmptyDirsAndFilesTask);
  await run(CreateReadmeTask);
  await run(TranspileSourceTask);
  await run(BuildPackagesTask);
  await run(CreatePackageJsonTask);
  await run(InstallDependenciesTask);
  await run(CleanPackagesTask);
  await run(CreateNoticeFileTask);
  await run(UpdateLicenseFileTask);
  await run(RemovePackageJsonDepsTask);
  await run(CleanExtraFilesFromModulesTask);
  await run(OptimizeBuildTask);

  /**
   * copy generic build outputs into platform-specific build
   * directories and perform platform-specific steps
   */
  await run(CreateArchivesSourcesTask);
  await run(CleanExtraBinScriptsTask);
  await run(CleanExtraBrowsersTask);

  /**
   * package platform-specific builds into archives
   * or os-specific packages in the target directory
   */
  if (createArchives) { // control w/ --skip-archives
    await run(CreateArchivesTask);
  }
  if (createDebPackage) { // control w/ --deb or --skip-os-packages
    await run(CreateDebPackageTask);
  }
  if (createRpmPackage) { // control w/ --rpm or --skip-os-packages
    await run(CreateRpmPackageTask);
  }

  /**
   * finalize artifacts by writing sha1sums of each into the target directory
   */
  await run(WriteShaSumsTask);
}
