/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '../../lib/spawn.mjs';
import { REPO_ROOT } from '../../lib/paths.mjs';
import path from 'path';
import fs from 'fs';

// @ts-ignore
export async function yarnInstallDeps(log, { offline, quiet }) {
  log.info('installing node dependencies with yarn');
  const args = ['install', '--non-interactive'];
  if (offline) args.push('--offline');
  if (quiet) args.push('--silent');
  await run('yarn', args, { cwd: process.cwd(), pipe: true });
}

export async function buildWebpackBundles(log, { offline, quiet }) {
  await buildSharedUIDepsNpm(log, { offline, quiet });
  await buildSharedUIDepsSrc(log, { offline, quiet });
  await buildKBNMonaco(log, { offline, quiet });
}

async function buildSharedUIDepsNpm(log, { offline, quiet }) {
  const pathToPackage = path.resolve(REPO_ROOT, 'packages', 'kbn-ui-shared-deps-npm');
  await copySources({
    log,
    root: pathToPackage,
    targetDir: path.resolve(REPO_ROOT, 'bazel-bin', 'packages', 'kbn-ui-shared-deps-npm'),
    include: ['index.js', 'src/**/*'],
    exclude: [
      '**/test_helpers.ts',
      '**/*.config.js',
      '**/*.mock.*',
      '**/*.test.*',
      '**/*.stories.*',
      '**/__snapshots__/**',
      '**/integration_tests/**',
      '**/mocks/**',
      '**/scripts/**',
      '**/storybook/**',
      '**/test_fixtures/**',
      '**/test_helpers/**',
    ],
  });
  const outPath = path.resolve(
    REPO_ROOT,
    'bazel-bin',
    'packages',
    'kbn-ui-shared-deps-npm',
    'shared_built_assets'
  ); // TODO: doesn't seem like this is the right place
  const env = process.env.DIST
    ? {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--openssl-legacy-provider',
      }
    : {
        NODE_ENV: 'development',
        NODE_OPTIONS: '--openssl-legacy-provider',
      };

  const args = [
    '--config',
    path.resolve(pathToPackage, 'webpack.config.js'),
    '--output-path',
    outPath,
    '--stats',
    'errors-only',
  ];

  log.info('building packages/kbn-ui-shared-deps-npm');

  return run('webpack-cli', args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

async function buildSharedUIDepsSrc(log, { offline, quiet }) {
  const pathToPackage = path.resolve(REPO_ROOT, 'packages', 'kbn-ui-shared-deps-src');
  await copySources({
    log,
    root: pathToPackage,
    targetDir: path.resolve(REPO_ROOT, 'bazel-bin', 'packages', 'kbn-ui-shared-deps-src'),
    include: ['index.js', 'webpack.config.js', 'src/**/*'],
    exclude: [],
  });
  const outPath = path.resolve(
    REPO_ROOT,
    'bazel-bin',
    'packages',
    'kbn-ui-shared-deps-src',
    'shared_built_assets'
  ); // TODO: doesn't seem like this is the right place
  const env = process.env.DIST
    ? {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--openssl-legacy-provider',
      }
    : {
        NODE_ENV: 'development',
        NODE_OPTIONS: '--openssl-legacy-provider',
      };

  const args = [
    '--config',
    path.resolve(pathToPackage, 'webpack.config.js'),
    '--output-path',
    outPath,
    '--stats',
    'errors-only',
  ];

  log.info('building packages/kbn-ui-shared-deps-src');

  return run('webpack-cli', args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

async function buildKBNMonaco(log, { offline, quiet }) {
  const pathToPackage = path.resolve(REPO_ROOT, 'packages', 'kbn-monaco');
  await copySources({
    log,
    root: pathToPackage,
    targetDir: path.resolve(REPO_ROOT, 'bazel-bin', 'packages', 'kbn-monaco'),
    include: ['src/**/*', 'index.ts', 'server.ts'],
    exclude: [
      '**/*.config.js',
      '**/*.mock.*',
      '**/*.test.*',
      '**/*.stories.*',
      '**/__jest_/**',
      '**/__snapshots__/**',
      '**/integration_tests/**',
      '**/mocks/**',
      '**/scripts/**',
      '**/storybook/**',
      '**/test_fixtures/**',
      '**/test_helpers/**',
    ],
  });

  const outPath = path.resolve(REPO_ROOT, 'bazel-bin', 'packages', 'kbn-monaco', 'target_workers'); // TODO: doesn't seem like this is the right place

  const env = process.env.DIST
    ? {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--openssl-legacy-provider',
      }
    : {
        NODE_ENV: 'development',
        NODE_OPTIONS: '--openssl-legacy-provider',
      };

  const args = [
    '--config',
    path.resolve(pathToPackage, 'webpack.config.js'),
    '--output-path',
    outPath,
    '--env',
    'prod',
    '--stats',
    'errors-only',
  ];

  log.info('building packages/kbn-monaco');

  return run('webpack-cli', args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

async function copySources({ log, root, targetDir, include, exclude }) {
  const allFiles = findAllFilesInFolder(root);
  const allFilesWithoutPrefix = allFiles.map((file) => file.replace(root + '/', ''));

  const filesToCopy = allFilesWithoutPrefix.filter((file) => {
    return (
      include.some((pattern) => isMatch(pattern, file, true)) &&
      !exclude.some((pattern) => isMatch(pattern, file, false))
    );
  });

  log.debug(`Copying ${filesToCopy.length} files`);

  for (const file of filesToCopy) {
    const targetFilePath = path.resolve(targetDir, file);
    const sourceFilePath = path.resolve(root, file);
    log.debug(`Copying ${sourceFilePath} to ${targetFilePath}`);
    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    fs.copyFileSync(sourceFilePath, targetFilePath);
  }
}

function findAllFilesInFolder(folder) {
  const files = fs.readdirSync(folder);
  const allFiles = [];
  files.forEach((file) => {
    const fullPath = path.join(folder, file);
    if (fs.statSync(fullPath).isDirectory()) {
      allFiles.push(...findAllFilesInFolder(fullPath));
    } else {
      allFiles.push(fullPath);
    }
  });

  return allFiles;
}

// This is a bit iffy, we should have a proper minimatch, not this fake
function isMatch(pattern, filename) {
  pattern = pattern.replace(/(\*\*\/)/g, '*');
  const regex = new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
  return regex.test(filename);
}

function escapeRegex(str) {
  // Escape special regex characters
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
