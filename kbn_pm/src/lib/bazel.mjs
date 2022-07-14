/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { spawnSync } from './spawn.mjs';
import * as Color from './colors.mjs';
import { createCliError } from './cli_error.mjs';
import { REPO_ROOT } from './paths.mjs';
import { cleanPaths } from './clean.mjs';
import { indent } from './indent.mjs';

const BAZEL_RUNNER_SRC = '../../../packages/kbn-bazel-runner/src/index.js';

async function getBazelRunner() {
  /* eslint-disable no-unsanitized/method */
  /** @type {import('@kbn/bazel-runner')} */
  const { runBazel, runIBazel } = await import(BAZEL_RUNNER_SRC);
  /* eslint-enable no-unsanitized/method */
  return { runBazel, runIBazel };
}

/**
 * @param {string} name
 * @param {number} code
 * @param {string} output
 */
function throwBazelError(name, code, output) {
  throw createCliError(
    `[${name}] exited with code [${code}]${output ? `\n  output:\n${indent(4, output)}}` : ''}`
  );
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {string[]} args
 * @param {{ quiet?: boolean; offline?: boolean, env?: Record<string, string> } | undefined} opts
 */
async function runBazel(log, args, opts = undefined) {
  const bazel = (await getBazelRunner()).runBazel;

  await bazel({
    log,
    args: [...(opts?.offline ? ['--config=offline'] : []), ...args],
    env: opts?.env,
    cwd: REPO_ROOT,
    quiet: opts?.quiet,
    logPrefix: Color.info('[bazel]'),
    onErrorExit(code, output) {
      throwBazelError('bazel', code, output);
    },
  });
}

/**
 *
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {{ offline: boolean } | undefined} opts
 */
export async function watch(log, opts = undefined) {
  const ibazel = (await getBazelRunner()).runIBazel;

  await ibazel({
    log,
    args: [
      // --run_output=false arg will disable the iBazel notifications about gazelle
      // and buildozer when running it. Could also be solved by adding a root
      // `.bazel_fix_commands.json` but its not needed at the moment
      '--run_output=false',
      'build',
      '//packages:build',
      '--show_result=1',
      ...(opts?.offline ? ['--config=offline'] : []),
    ],
    cwd: REPO_ROOT,
    logPrefix: Color.info('[ibazel]'),
    onErrorExit(code, output) {
      throwBazelError('ibazel', code, output);
    },
  });
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {{ quiet?: boolean } | undefined} opts
 */
export async function clean(log, opts = undefined) {
  await runBazel(log, ['clean'], {
    quiet: opts?.quiet,
  });
  log.success('soft cleaned bazel');
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {{ quiet?: boolean } | undefined} opts
 */
export async function expungeCache(log, opts = undefined) {
  await runBazel(log, ['clean', '--expunge'], {
    quiet: opts?.quiet,
  });
  log.success('hard cleaned bazel');
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export async function cleanDiskCache(log) {
  const repositoryCachePath = spawnSync('bazel', ['info', 'repository_cache']);

  await cleanPaths(log, [
    Path.resolve(Path.dirname(repositoryCachePath), 'disk-cache'),
    Path.resolve(repositoryCachePath),
  ]);

  log.success('removed disk caches');
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {{ offline?: boolean, quiet?: boolean } | undefined} opts
 */
export async function installYarnDeps(log, opts = undefined) {
  await runBazel(log, ['run', '@nodejs//:yarn'], {
    offline: opts?.offline,
    quiet: opts?.quiet,
    env: {
      SASS_BINARY_SITE:
        'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-sass',
      RE2_DOWNLOAD_MIRROR:
        'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2',
    },
  });

  log.success('yarn deps installed');
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {{ offline?: boolean, quiet?: boolean } | undefined} opts
 */
export async function buildPackages(log, opts = undefined) {
  await runBazel(log, ['build', '//packages:build', '--show_result=1'], {
    offline: opts?.offline,
    quiet: opts?.quiet,
  });

  log.success('packages built');
}

/**
 * @param {string} versionFilename
 * @returns
 */
function readBazelToolsVersionFile(versionFilename) {
  const version = Fs.readFileSync(Path.resolve(REPO_ROOT, versionFilename), 'utf8').trim();

  if (!version) {
    throw new Error(
      `[bazel_tools] Failed on reading bazel tools versions\n ${versionFilename} file do not contain any version set`
    );
  }

  return version;
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export function tryRemovingBazeliskFromYarnGlobal(log) {
  try {
    // Check if Bazelisk is installed on the yarn global scope
    const stdout = spawnSync('yarn', ['global', 'list']);

    // Bazelisk was found on yarn global scope so lets remove it
    if (stdout.includes(`@bazel/bazelisk@`)) {
      spawnSync('yarn', ['global', 'remove', `@bazel/bazelisk`]);

      log.info(`[bazel_tools] bazelisk was installed on Yarn global packages and is now removed`);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export function isInstalled(log) {
  try {
    const stdout = spawnSync('bazel', ['--version']).trim();
    const bazelVersion = readBazelToolsVersionFile('.bazelversion');

    if (stdout === `bazel ${bazelVersion}`) {
      return true;
    } else {
      log.info(`[bazel_tools] Bazel is installed (${stdout}), but was expecting ${bazelVersion}`);
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export function ensureInstalled(log) {
  if (isInstalled(log)) {
    return;
  }

  // Install bazelisk if not installed
  log.debug(`[bazel_tools] reading bazel tools versions from version files`);
  const bazeliskVersion = readBazelToolsVersionFile('.bazeliskversion');
  const bazelVersion = readBazelToolsVersionFile('.bazelversion');

  log.info(`[bazel_tools] installing Bazel tools`);

  log.debug(
    `[bazel_tools] bazelisk is not installed. Installing @bazel/bazelisk@${bazeliskVersion} and bazel@${bazelVersion}`
  );
  spawnSync('npm', ['install', '--global', `@bazel/bazelisk@${bazeliskVersion}`], {
    env: {
      USE_BAZEL_VERSION: bazelVersion,
    },
  });

  const isBazelBinAvailableAfterInstall = isInstalled(log);
  if (!isBazelBinAvailableAfterInstall) {
    throw new Error(
      `[bazel_tools] an error occurred when installing the Bazel tools. Please make sure you have access to npm globally installed modules on your $PATH`
    );
  }

  log.success(`[bazel_tools] bazel tools installed`);
}
