/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import dedent from 'dedent';
import { resolve } from 'path';
import { spawn } from '../child_process';
import { readFile } from '../fs';
import { log } from '../log';

async function readBazelToolsVersionFile(repoRootPath: string, versionFilename: string) {
  const version = (await readFile(resolve(repoRootPath, versionFilename)))
    .toString()
    .split('\n')[0];

  if (!version) {
    throw new Error(
      `[bazel_tools] Failed on reading bazel tools versions\n ${versionFilename} file do not contain any version set`
    );
  }

  return version;
}

async function isBazelBinAvailable() {
  try {
    await spawn('bazel', ['--version'], { stdio: 'pipe' });

    return true;
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
  const { stdout: bazeliskPkgInstallStdout } = await spawn('yarn', ['global', 'list'], {
    stdio: 'pipe',
  });

  const isBazelBinAlreadyAvailable = await isBazelBinAvailable();

  // Install bazelisk if not installed
  if (
    !bazeliskPkgInstallStdout.includes(`@bazel/bazelisk@${bazeliskVersion}`) ||
    !isBazelBinAlreadyAvailable
  ) {
    log.info(`[bazel_tools] installing Bazel tools`);

    log.debug(
      `[bazel_tools] bazelisk is not installed. Installing @bazel/bazelisk@${bazeliskVersion} and bazel@${bazelVersion}`
    );
    await spawn('yarn', ['global', 'add', `@bazel/bazelisk@${bazeliskVersion}`], {
      env: {
        USE_BAZEL_VERSION: bazelVersion,
      },
      stdio: 'pipe',
    });

    const isBazelBinAvailableAfterInstall = await isBazelBinAvailable();
    if (!isBazelBinAvailableAfterInstall) {
      throw new Error(dedent`
        [bazel_tools] an error occurred when installing the Bazel tools. Please make sure 'yarn global bin' is on your $PATH, otherwise just add it there
      `);
    }
  }

  log.success(`[bazel_tools] all bazel tools are correctly installed`);
}
