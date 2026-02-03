/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Run Vitest tests
//
// Provides Vitest with `--config` to the first vitest.config.mts file found in the current
// directory, or while going up in the directory chain. If the current working directory
// is nested under the config path, a pattern will be provided to Vitest to only run the
// tests within that directory.
//
// Any additional options passed will be forwarded to Vitest.
//
// See all cli options in https://vitest.dev/guide/cli.html

import { resolve, relative } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import getopts from 'getopts';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';

// Config file names to search for (in priority order)
const VITEST_CONFIG_NAMES = ['vitest.config.mts', 'vitest.config.ts', 'vitest.config.js'];

// Skip 'node' and script name
const NODE_ARGV_SLICE_INDEX = 2;

/**
 * Searches for Vitest config files in the directory tree, starting from a given path
 * and walking up to the repository root.
 *
 * @param startPath - Directory path to start searching from
 * @param configNames - Array of config file names to search for (in priority order)
 * @returns Path to the first config file found, or null if none found
 */
function findConfigInDirectoryTree(startPath: string, configNames: string[]): string | null {
  let currentPath = startPath;

  while (currentPath !== REPO_ROOT && currentPath !== resolve(currentPath, '..')) {
    for (const configName of configNames) {
      const configPath = resolve(currentPath, configName);
      if (existsSync(configPath)) {
        return configPath;
      }
    }
    currentPath = resolve(currentPath, '..');
  }

  return null;
}

/**
 * Finds the common base path by sorting the array and comparing the first and last element.
 *
 * @param paths - Array of file/directory paths
 * @returns Common base path shared by all input paths
 */
function commonBasePath(paths: string[] = []): string {
  if (paths.length === 0) return '';

  const sortedPaths = paths.concat().sort();
  const firstPath = sortedPaths[0].split('/');
  const lastPath = sortedPaths[sortedPaths.length - 1].split('/');

  const maxLength = firstPath.length;
  let commonSegmentIndex = 0;

  while (
    commonSegmentIndex < maxLength &&
    firstPath[commonSegmentIndex] === lastPath[commonSegmentIndex]
  ) {
    commonSegmentIndex++;
  }

  return firstPath.slice(0, commonSegmentIndex).join('/');
}

/**
 * Discovers Vitest configuration file by searching the directory tree.
 *
 * @param testFiles - Array of test file paths
 * @param currentWorkingDirectory - Current working directory
 * @param log - Logger instance for verbose output
 * @returns Path to discovered config file
 * @throws Error if no config file is found
 */
function discoverVitestConfig(
  testFiles: string[],
  currentWorkingDirectory: string,
  log: ToolingLog
): string {
  const commonTestFiles = commonBasePath(testFiles);
  const testFilesProvided = testFiles.length > 0;

  log.verbose('cwd:', currentWorkingDirectory);
  log.verbose('testFiles:', testFiles.join(', '));
  log.verbose('commonTestFiles:', commonTestFiles);

  // Start searching from either the common test files directory or current working directory
  const searchStartPath = testFilesProvided ? commonTestFiles : currentWorkingDirectory;
  const configPath = findConfigInDirectoryTree(searchStartPath, VITEST_CONFIG_NAMES);

  if (!configPath) {
    if (testFilesProvided) {
      log.error(
        `unable to find a vitest.config.{mts,ts,js} file in ${commonTestFiles} or any parent directory up to the root of the repo. This CLI can only run Vitest tests which resolve to a single vitest config file, and that file must exist in a parent directory of all the paths you pass.`
      );
    } else {
      log.error(
        `we do not ship a root vitest config file so you either need to pass a path to a test file, a folder where tests can be found, or a --config argument pointing to one of the vitest.config.{mts,ts,js} files in the repository`
      );
    }
    process.exit(1);
  }

  log.verbose(`no config provided, found ${configPath}`);
  return configPath;
}

/**
 * Runs Vitest tests with automatic config discovery and argument forwarding.
 *
 * Searches for vitest.config.{mts,ts,js} files starting from the working directory
 * and walking up the directory tree until reaching the repo root.
 */
export async function runVitest(): Promise<void> {
  // Parse command line arguments
  const unknownFlags: string[] = [];
  const parsedArguments = getopts(process.argv.slice(NODE_ARGV_SLICE_INDEX), {
    string: ['config', 'testNamePattern', 'reporter'],
    boolean: ['watch', 'run', 'help', 'verbose', 'coverage', 'ui'],
    alias: {
      c: 'config',
      t: 'testNamePattern',
      w: 'watch',
      h: 'help',
      v: 'verbose',
    },
    unknown(flag) {
      // Allow unknown flags to pass through to vitest
      return true;
    },
  });

  // Set up logging
  const log = new ToolingLog({
    level: parsedArguments.verbose ? 'verbose' : 'info',
    writeTo: process.stdout,
  });

  // Set default NODE_ENV
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }

  const currentWorkingDirectory: string = process.env.INIT_CWD || process.cwd();
  let testFiles: string[] = [];
  let resolvedConfigPath: string = '';

  // Handle config discovery if no config was explicitly provided
  if (parsedArguments.config) {
    // Resolve the config path to absolute
    resolvedConfigPath = resolve(currentWorkingDirectory, parsedArguments.config);
  } else {
    testFiles = parsedArguments._.map((p: any) => resolve(currentWorkingDirectory, p.toString()));
    resolvedConfigPath = discoverVitestConfig(testFiles, currentWorkingDirectory, log);
  }

  // Build vitest arguments
  const vitestArgs: string[] = ['--config', resolvedConfigPath];

  // Add --run flag by default (no watch mode) unless --watch is specified
  if (!parsedArguments.watch) {
    vitestArgs.push('--run');
  }

  // Forward all original arguments except config (which we've already handled)
  const originalArgs = process.argv.slice(NODE_ARGV_SLICE_INDEX);
  for (let i = 0; i < originalArgs.length; i++) {
    const arg = originalArgs[i];

    // Skip --config and its value
    if (arg === '--config' || arg === '-c') {
      i++; // Skip the next argument (the config value)
      continue;
    }
    if (arg.startsWith('--config=') || arg.startsWith('-c=')) {
      continue;
    }

    vitestArgs.push(arg);
  }

  // If no test files provided but we're in a subdirectory, add the relative path
  const testFilesProvided = testFiles.length > 0;
  if (!testFilesProvided && parsedArguments._.length === 0) {
    const configDir = resolve(resolvedConfigPath, '..');
    if (currentWorkingDirectory !== configDir) {
      const relativePath = relative(configDir, currentWorkingDirectory);
      if (relativePath && !relativePath.startsWith('..')) {
        vitestArgs.push(relativePath);
      }
    }
  }

  log.info('yarn vitest', vitestArgs.join(' '));

  // Determine the working directory - use the config file's directory
  const configDir = resolve(resolvedConfigPath, '..');

  // Run vitest using npx from the config's directory
  const vitestProcess = spawn('npx', ['vitest', ...vitestArgs], {
    cwd: configDir,
    stdio: 'inherit',
    env: {
      ...process.env,
    },
  });

  return new Promise((resolvePromise, rejectPromise) => {
    vitestProcess.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        process.exit(code ?? 1);
      }
    });

    vitestProcess.on('error', (error) => {
      log.error('Failed to run vitest:', error.message);
      process.exit(1);
    });
  });
}
