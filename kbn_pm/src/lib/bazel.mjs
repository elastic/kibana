/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { run } from './spawn.mjs';
import * as Color from './colors.mjs';
import { createCliError } from './cli_error.mjs';
import { REPO_ROOT } from './paths.mjs';
import { cleanPaths } from './clean.mjs';
import { indent } from './indent.mjs';

const BAZEL_RUNNER_SRC = '../../../packages/kbn-bazel-runner/index.js';

const BAZEL_TARGETS = [
  '//packages/kbn-ui-shared-deps-npm:shared_built_assets',
  '//packages/kbn-ui-shared-deps-src:shared_built_assets',
  '//packages/kbn-monaco:target_workers',
];

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
 * @param {{ quiet?: boolean; offline?: boolean, reactVersion?: string, env?: Record<string, string> } | undefined} opts
 */
async function runBazel(log, inputArgs, opts = undefined) {
  const bazel = (await getBazelRunner()).runBazel;

  const args = [
    ...inputArgs,
    `--define=REACT_18=${opts?.reactVersion === '18' ? 'true' : 'false'}`,
    ...(opts?.offline ? ['--config=offline'] : []),
  ];
  log.debug(`> bazel ${args.join(' ')}`);
  await bazel(args, {
    env: { ...opts?.env, REACT_18: opts?.reactVersion === '18' ? 'true' : 'false' },
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
    ...BAZEL_TARGETS,
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
  const repositoryCachePath = (await run('bazel', args)).trim();

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
  });

  log.success('yarn deps installed');

  await run('yarn', ['playwright', 'install']);

  log.success('Playwright browsers installed');
}

/**
 * @param {import('./log.mjs').Log} log
 * @param {{ offline?: boolean, quiet?: boolean, reactVersion?: string } | undefined} opts
 */
export async function buildWebpackBundles(log, opts = undefined) {
  await runBazel(log, ['build', ...BAZEL_TARGETS, '--show_result=1'], {
    offline: opts?.offline,
    quiet: opts?.quiet,
    reactVersion: opts?.reactVersion,
  });

  log.success('shared bundles built');
}

/**
 * @param {string} versionFilename
 * @returns
 */
async function readBazelToolsVersionFile(versionFilename) {
  const path = Path.resolve(REPO_ROOT, versionFilename);
  const version = (await Fsp.readFile(path, 'utf8')).trim();

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
export async function tryRemovingBazeliskFromYarnGlobal(log) {
  try {
    log.debug('Checking if Bazelisk is installed on the yarn global scope');
    const stdout = await run('yarn', ['global', 'list']);

    if (stdout.includes(`@bazel/bazelisk@`)) {
      log.debug('Bazelisk was found on yarn global scope, removing it');
      await run('yarn', ['global', 'remove', `@bazel/bazelisk`]);

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
export async function isInstalled(log) {
  try {
    log.debug('getting bazel version');
    const [stdout, bazelVersion] = await Promise.all([
      run('bazel', ['--version']),
      readBazelToolsVersionFile('.bazelversion'),
    ]);

    const installed = stdout.trim();

    if (installed === `bazel ${bazelVersion}`) {
      return true;
    } else {
      log.info(`Bazel is installed (${installed}), but was expecting ${bazelVersion}`);
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * @param {import('./log.mjs').Log} log
 */
export async function ensureInstalled(log) {
  if (await isInstalled(log)) {
    return;
  }

  // Install bazelisk if not installed
  log.debug(`reading bazel tools versions from version files`);
  const [bazeliskVersion, bazelVersion] = await Promise.all([
    readBazelToolsVersionFile('.bazeliskversion'),
    readBazelToolsVersionFile('.bazelversion'),
  ]);

  log.info(`installing Bazel tools`);

  log.debug(
    `bazelisk is not installed. Installing @bazel/bazelisk@${bazeliskVersion} and bazel@${bazelVersion}`
  );
  await run('npm', ['install', '--global', `@bazel/bazelisk@${bazeliskVersion}`], {
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
