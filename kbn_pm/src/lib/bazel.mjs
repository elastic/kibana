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

const BAZEL_RUNNER_SRC = '../../../packages/kbn-bazel-runner/index.js';

async function getBazelRunner() {
  /* eslint-disable no-unsanitized/method */
  /** @type {import('@kbn/bazel-runner')} */
  const { runBazel, runIBazel } = await import(BAZEL_RUNNER_SRC);
  /* eslint-enable no-unsanitized/method */
  return { runBazel, runIBazel };
}

/**
 * @param {import('./log.mjs').Log} log
 * @param {string} name
 * @param {number} code
 * @param {string} output
 */
function throwBazelError(log, name, code, output) {
  const tag = Color.title('HINT');
  log._write(
    [
      tag,
      tag +
        'If experiencing problems with node_modules try `yarn kbn bootstrap --force-install` or as last resort `yarn kbn reset && yarn kbn bootstrap`',
      tag,
    ].join('\n')
  );

  throw createCliError(
    `[${name}] exited with code [${code}]${output ? `\n  output:\n${indent(4, output)}}` : ''}`
  );
}

/**
 * @param {import('./log.mjs').Log} log
 * @param {string[]} inputArgs
 * @param {{ quiet?: boolean; offline?: boolean, env?: Record<string, string> } | undefined} opts
 */
async function runBazel(log, inputArgs, opts = undefined) {
  const bazel = (await getBazelRunner()).runBazel;

  const args = [...inputArgs, ...(opts?.offline ? ['--config=offline'] : [])];
  log.debug(`> bazel ${args.join(' ')}`);
  await bazel(args, {
    env: opts?.env,
    cwd: REPO_ROOT,
    quiet: opts?.quiet,
    logPrefix: Color.info('[bazel]'),
    onErrorExit(code, output) {
      throwBazelError(log, 'bazel', code, output);
    },
  });
}

/**
 *
 * @param {import('./log.mjs').Log} log
 * @param {{ offline: boolean } | undefined} opts
 */
export async function watch(log, opts = undefined) {
  const ibazel = (await getBazelRunner()).runIBazel;

  const args = [
    // --run_output=false arg will disable the iBazel notifications about gazelle
    // and buildozer when running it. Could also be solved by adding a root
    // `.bazel_fix_commands.json` but its not needed at the moment
    '--run_output=false',
    'build',
    '//packages:build',
    '--show_result=1',
    ...(opts?.offline ? ['--config=offline'] : []),
  ];
  log.debug(`> ibazel ${args.join(' ')}`);
  await ibazel(args, {
    cwd: REPO_ROOT,
    logPrefix: Color.info('[ibazel]'),
    onErrorExit(code, output) {
      throwBazelError(log, 'ibazel', code, output);
    },
  });
}

/**
 * @param {import('./log.mjs').Log} log
 * @param {{ quiet?: boolean } | undefined} opts
 */
export async function clean(log, opts = undefined) {
  await runBazel(log, ['clean'], {
    quiet: opts?.quiet,
  });
  log.success('soft cleaned bazel');
}

/**
 * @param {import('./log.mjs').Log} log
 * @param {{ quiet?: boolean } | undefined} opts
 */
export async function expungeCache(log, opts = undefined) {
  await runBazel(log, ['clean', '--expunge'], {
    quiet: opts?.quiet,
  });
  log.success('hard cleaned bazel');
}

/**
 * @param {import('./log.mjs').Log} log
 */
export async function cleanDiskCache(log) {
  const args = ['info', 'repository_cache'];
  log.debug(`> bazel ${args.join(' ')}`);
  const repositoryCachePath = spawnSync('bazel', args);

  await cleanPaths(log, [
    Path.resolve(Path.dirname(repositoryCachePath), 'disk-cache'),
    Path.resolve(repositoryCachePath),
  ]);

  log.success('removed disk caches');
}

/**
 * @param {import('./log.mjs').Log} log
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
 * @param {import('./log.mjs').Log} log
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
      `Failed on reading bazel tools versions\n ${versionFilename} file do not contain any version set`
    );
  }

  return version;
}

/**
 * @param {import('./log.mjs').Log} log
 */
export function tryRemovingBazeliskFromYarnGlobal(log) {
  try {
    log.debug('Checking if Bazelisk is installed on the yarn global scope');
    const stdout = spawnSync('yarn', ['global', 'list']);

    if (stdout.includes(`@bazel/bazelisk@`)) {
      log.debug('Bazelisk was found on yarn global scope, removing it');
      spawnSync('yarn', ['global', 'remove', `@bazel/bazelisk`]);

      log.info(`bazelisk was installed on Yarn global packages and is now removed`);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * @param {import('./log.mjs').Log} log
 */
export function isInstalled(log) {
  try {
    log.debug('getting bazel version');
    const stdout = spawnSync('bazel', ['--version']).trim();
    const bazelVersion = readBazelToolsVersionFile('.bazelversion');

    if (stdout === `bazel ${bazelVersion}`) {
      return true;
    } else {
      log.info(`Bazel is installed (${stdout}), but was expecting ${bazelVersion}`);
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * @param {import('./log.mjs').Log} log
 */
export function ensureInstalled(log) {
  if (isInstalled(log)) {
    return;
  }

  // Install bazelisk if not installed
  log.debug(`reading bazel tools versions from version files`);
  const bazeliskVersion = readBazelToolsVersionFile('.bazeliskversion');
  const bazelVersion = readBazelToolsVersionFile('.bazelversion');

  log.info(`installing Bazel tools`);

  log.debug(
    `bazelisk is not installed. Installing @bazel/bazelisk@${bazeliskVersion} and bazel@${bazelVersion}`
  );
  spawnSync('npm', ['install', '--global', `@bazel/bazelisk@${bazeliskVersion}`], {
    env: {
      USE_BAZEL_VERSION: bazelVersion,
    },
  });

  const isBazelBinAvailableAfterInstall = isInstalled(log);
  if (!isBazelBinAvailableAfterInstall) {
    throw new Error(
      `an error occurred when installing the Bazel tools. Please make sure you have access to npm globally installed modules on your $PATH`
    );
  }

  log.success(`bazel tools installed`);
}
