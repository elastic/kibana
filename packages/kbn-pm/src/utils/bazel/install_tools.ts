/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import { resolve } from 'path';
import { spawn } from '../child_process';
import { readFile } from '../fs';
import { log } from '../log';

async function readBazelToolsVersionFile(repoRootPath: string, versionFilename: string) {
  const version = (await readFile(resolve(repoRootPath, versionFilename)))
    .toString()
    .split('\n')[0]
    .trim();

  if (!version) {
    throw new Error(
      `[bazel_tools] Failed on reading bazel tools versions\n ${versionFilename} file do not contain any version set`
    );
  }

  return version;
}

export async function isBazelBinAvailable(repoRootPath: string) {
  try {
    const installedVersion = await spawn('bazel', ['--version'], { stdio: 'pipe' });
    const bazelVersion = await readBazelToolsVersionFile(repoRootPath, '.bazelversion');

    if (installedVersion.stdout === `bazel ${bazelVersion}`) {
      return true;
    } else {
      log.info(
        `[bazel_tools] Bazel is installed (${installedVersion.stdout}), but was expecting ${bazelVersion}`
      );
      return false;
    }
  } catch {
    return false;
  }
}

async function tryRemoveBazeliskFromYarnGlobal() {
  try {
    // Check if Bazelisk is installed on the yarn global scope
    const { stdout: bazeliskPkgInstallStdout } = await spawn('yarn', ['global', 'list'], {
      stdio: 'pipe',
    });

    // Bazelisk was found on yarn global scope so lets remove it
    if (bazeliskPkgInstallStdout.includes(`@bazel/bazelisk@`)) {
      await spawn('yarn', ['global', 'remove', `@bazel/bazelisk`], {
        stdio: 'pipe',
      });

      log.info(`[bazel_tools] bazelisk was installed on Yarn global packages and is now removed`);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function installBazelTools(repoRootPath: string) {
  log.debug(`[bazel_tools] reading bazel tools versions from version files`);
  const bazeliskVersion = await readBazelToolsVersionFile(repoRootPath, '.bazeliskversion');
  const bazelVersion = await readBazelToolsVersionFile(repoRootPath, '.bazelversion');

  // Check what globals are installed
  log.debug(`[bazel_tools] verify if bazelisk is installed`);

  // Check if we need to remove bazelisk from yarn
  await tryRemoveBazeliskFromYarnGlobal();

  // Test if bazel bin is available
  const isBazelBinAlreadyAvailable = await isBazelBinAvailable(repoRootPath);

  // Install bazelisk if not installed
  if (!isBazelBinAlreadyAvailable) {
    log.info(`[bazel_tools] installing Bazel tools`);

    log.debug(
      `[bazel_tools] bazelisk is not installed. Installing @bazel/bazelisk@${bazeliskVersion} and bazel@${bazelVersion}`
    );
    await spawn('npm', ['install', '--global', `@bazel/bazelisk@${bazeliskVersion}`], {
      env: {
        USE_BAZEL_VERSION: bazelVersion,
      },
      stdio: 'pipe',
    });

    const isBazelBinAvailableAfterInstall = await isBazelBinAvailable(repoRootPath);
    if (!isBazelBinAvailableAfterInstall) {
      throw new Error(dedent`
        [bazel_tools] an error occurred when installing the Bazel tools. Please make sure you have access to npm globally installed modules on your $PATH
      `);
    }
  }

  log.success(`[bazel_tools] all bazel tools are correctly installed`);
}
