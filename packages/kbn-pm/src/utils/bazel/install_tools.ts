/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { spawn } from '../child_process';
import { readFile } from '../fs';
import { log } from '../log';

export interface BazelToolsVersion {
  bazelisk: string;
  bazel: string;
}

async function readBazelToolsVersionFile(repoRootPath: string, versionFilename: string) {
  const version = (await readFile(resolve(repoRootPath, versionFilename)))
    .toString()
    .split('\n')[0];

  if (!version) {
    throw new Error(`${versionFilename} file do not contain any version set`);
  }

  return version;
}

async function readBazelToolsVersion(repoRootPath: string) {
  try {
    const bazeliskVersion = await readBazelToolsVersionFile(repoRootPath, '.bazeliskversion');
    const bazelVersion = await readBazelToolsVersionFile(repoRootPath, '.bazelversion');

    return {
      bazelisk: bazeliskVersion,
      bazel: bazelVersion,
    } as BazelToolsVersion;
  } catch (e) {
    throw new Error(`[bazel_tools] Failed on reading bazel tools versions\n ${e}`);
  }
}

export async function installBazelTools(repoRootPath: string) {
  log.debug(`[bazel_tools] reading bazel tools versions from version files`);
  const bazelToolsVersions = await readBazelToolsVersion(repoRootPath);

  // Check what globals are installed
  log.debug(`[bazel_tools] verify if bazelisk is installed`);
  const { stdout } = await spawn('yarn', ['global', 'list'], { stdio: 'pipe' });

  // Install bazelisk if not installed
  if (!stdout.includes(`@bazel/bazelisk@${bazelToolsVersions.bazelisk}`)) {
    log.info(`[bazel_tools] installing Bazel tools`);

    log.debug(
      `[bazel_tools] bazelisk is not installed. Installing @bazel/bazelisk@${bazelToolsVersions.bazelisk} and bazel@${bazelToolsVersions.bazel}`
    );
    await spawn('yarn', ['global', 'add', `@bazel/bazelisk@${bazelToolsVersions.bazelisk}`], {
      env: {
        USE_BAZEL_VERSION: bazelToolsVersions.bazel,
      },
      stdio: 'pipe',
    });
  }

  log.success(`[bazel_tools] all bazel tools are correctly installed`);
}
