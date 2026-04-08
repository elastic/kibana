/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Run Jest tests
//
// Provides Jest with `--config` to the first jest.config.js file found in the current
// directory, or while going up in the directory chain. If the current working directory
// is nested under the config path, a pattern will be provided to Jest to only run the
// tests within that directory.
//
// Any additional options passed will be forwarded to Jest.
//
// See all cli options in https://facebook.github.io/jest/docs/cli.html

import { resolve, relative, sep as osSep, join } from 'path';
import { promises as fs, existsSync } from 'fs';
import { run } from 'jest';
import { readInitialOptions } from 'jest-config';
import getopts from 'getopts';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { SCOUT_REPORTER_ENABLED } from '@kbn/scout-info';
import type { Config } from '@jest/types';

import jestFlags from './jest_flags.json';

const JEST_CACHE_DIR = 'data/jest-cache';

// Skip 'node' and script name
const NODE_ARGV_SLICE_INDEX = 2;

/**
 * Runs Jest tests with automatic config discovery and argument forwarding.
 *
 * Searches for jest.config.js files starting from the working directory
 * and walking up the directory tree until reaching the repo root.
 *
 * @param configName - Name of the Jest config file to search for
 */
export async function runJest(configName = 'jest.config.js'): Promise<void> {
  // Parse and validate command line arguments
  const { parsedArguments } = parseJestArguments();

  // Set up logging
  const log = new ToolingLog({
    level: parsedArguments.verbose ? 'verbose' : 'info',
    writeTo: process.stdout,
  });

  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/jest');

  // Set default NODE_ENV
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }

  const currentWorkingDirectory: string = process.env.INIT_CWD || process.cwd();
  let testFiles: string[] = [];
  let resolvedConfigPath: string | undefined;

  // Handle config discovery if no config was explicitly provided
  if (!parsedArguments.config) {
    testFiles = parsedArguments._.map((p: any) => resolve(currentWorkingDirectory, p.toString()));

    if (parsedArguments.testPathPattern) {
      testFiles.push(parsedArguments.testPathPattern);
    }

    resolvedConfigPath = discoverJestConfig(testFiles, currentWorkingDirectory, configName, log);
    process.argv.push('--config', resolvedConfigPath);

    const testFilesProvided = testFiles.length > 0;
    if (!testFilesProvided) {
      log.verbose(`no test files provided, setting to current directory`);
      const commonTestFiles = commonBasePath(testFiles);
      const workingDirectory = testFilesProvided ? commonTestFiles : currentWorkingDirectory;
      process.argv.push(relative(workingDirectory, currentWorkingDirectory));
    }
  }

  // Resolve Jest configuration
  const baseConfig = await resolveJestConfig(parsedArguments, resolvedConfigPath);

  // Set up Scout reporter if enabled
  if (SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
    process.env.JEST_CONFIG_PATH = resolvedConfigPath;
  }

  log.debug('Setting up Jest with shared cache directory...');

  // Prepare Jest execution context
  const { originalArgv, jestArgv } = await prepareJestExecution(baseConfig);

  log.info('yarn jest', originalArgv.join(' '));

  log.debug('Setting up Jest with shared cache directory:', jestArgv.join(' '));

  // Run Jest and report timing
  return run(jestArgv).then(() => {
    // Success means that tests finished, doesn't mean they passed.
    reportTime(runStartTime, 'total', {
      success: true,
      isXpack: currentWorkingDirectory.includes('x-pack'),
      testFiles: testFiles.map((testFile) => relative(currentWorkingDirectory, testFile)),
    });
  });
}

interface ParsedJestArguments {
  parsedArguments: any;
  unknownFlags: string[];
}

/**
 * Parses command line arguments and validates Jest flags.
 *
 * @returns Object containing parsed arguments and any unknown flags
 * @throws Error if unknown flags are detected
 */
function parseJestArguments(): ParsedJestArguments {
  const unknownFlags: string[] = [];
  const parsedArguments = getopts(process.argv.slice(NODE_ARGV_SLICE_INDEX), {
    ...jestFlags,
    unknown(flag) {
      unknownFlags.push(flag);
      return false;
    },
  });

  if (parsedArguments.help) {
    run();
    process.exit(0);
  }

  if (unknownFlags.length > 0) {
    const flagsList = unknownFlags.join(', ');
    throw createFailError(`unexpected flag: ${flagsList}

  If this flag is valid you might need to update the flags in "src/platform/packages/shared/kbn-test/src/jest/run.js".

  Run 'yarn jest --help | node scripts/read_jest_help.mjs' to update this scripts knowledge of what
  flags jest supports

`);
  }

  return { parsedArguments, unknownFlags };
}

/**
 * Searches for Jest config files in the directory tree, starting from a given path
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
 * Discovers Jest configuration file by searching the directory tree.
 *
 * @param testFiles - Array of test file paths
 * @param currentWorkingDirectory - Current working directory
 * @param configName - Standard config file name to search for
 * @param log - Logger instance for verbose output
 * @returns Path to discovered config file
 * @throws Error if no config file is found
 */
function discoverJestConfig(
  testFiles: string[],
  currentWorkingDirectory: string,
  configName: string,
  log: ToolingLog
): string {
  const commonTestFiles = commonBasePath(testFiles);
  const testFilesProvided = testFiles.length > 0;

  log.verbose('cwd:', currentWorkingDirectory);
  log.verbose('testFiles:', testFiles.join(', '));
  log.verbose('commonTestFiles:', commonTestFiles);

  // Start searching from either the common test files directory or current working directory
  const searchStartPath = testFilesProvided ? commonTestFiles : currentWorkingDirectory;
  const configPath = findConfigInDirectoryTree(searchStartPath, ['jest.config.dev.js', configName]);

  if (!configPath) {
    if (testFilesProvided) {
      log.error(
        `unable to find a ${configName} file in ${commonTestFiles} or any parent directory up to the root of the repo. This CLI can only run Jest tests which resolve to a single ${configName} file, and that file must exist in a parent directory of all the paths you pass.`
      );
    } else {
      log.error(
        `we no longer ship a root config file so you either need to pass a path to a test file, a folder where tests can be found, a --testPathPattern argument pointing to a file/directory or a --config argument pointing to one of the many ${configName} files in the repository`
      );
    }
    process.exit(1);
  }

  log.verbose(`no config provided, found ${configPath}`);
  return configPath;
}

/**
 * Resolves Jest configuration from either inline JSON or config file path.
 *
 * @param parsedArguments - Parsed command line arguments
 * @param resolvedConfigPath - Path to config file (optional)
 * @returns Promise resolving to Jest initial options
 * @throws Error if config cannot be resolved or file doesn't exist
 */
async function resolveJestConfig(
  parsedArguments: any,
  resolvedConfigPath?: string
): Promise<Config.InitialOptions> {
  let initialOptions: Config.InitialOptions | undefined;

  // If a config path was provided via argv, try to parse it as JSON first
  if (parsedArguments.config) {
    try {
      initialOptions = JSON.parse(parsedArguments.config);
    } catch (err) {
      // If JSON parsing fails, treat it as a config file path
      resolvedConfigPath = parsedArguments.config;
    }
  }

  if (!initialOptions && !resolvedConfigPath) {
    throw new Error(
      '--config is not set or invalid, and no config path was found for any listed files'
    );
  }

  if (!initialOptions) {
    const configFileExists = await fs
      .stat(resolvedConfigPath!)
      .then((stat) => stat.isFile())
      .catch(() => false);

    if (!configFileExists) {
      throw new Error(`Config at ${resolvedConfigPath} does not exist`);
    }

    // readInitialOptions returns an object that includes the resolved Jest config at `config`
    // along with some metadata (e.g. configPath). We only want to pass the actual Jest
    // config object to --config, augmented with our overrides.
    initialOptions = (await readInitialOptions(resolvedConfigPath!)).config;
  }

  return initialOptions;
}

interface JestExecutionContext {
  jestArgv: string[];
  originalArgv: string[];
}

/**
 * Prepares Jest execution context by setting up configuration and arguments.
 * This will make sure Jest uses an inline JSON config which has a cache directory set.
 *
 * @param baseConfig - Base Jest configuration
 * @returns Jest execution context with processed arguments (already sliced for Jest consumption)
 */
async function prepareJestExecution(
  baseConfig: Config.InitialOptions
): Promise<JestExecutionContext> {
  const cacheDirectory = join(REPO_ROOT, JEST_CACHE_DIR);

  const inlineConfig = {
    ...baseConfig,
    id: 'kbn-test-jest',
    cacheDirectory,
  };

  // Create shared cache directory
  await fs.mkdir(cacheDirectory, { recursive: true });

  // Remove existing --config flags and provide the inline JSON config
  const argumentsWithoutConfig = removeFlagFromArgv(process.argv, 'config');

  const jestArgv = [
    `--config`,
    JSON.stringify(inlineConfig),
    ...argumentsWithoutConfig.slice(NODE_ARGV_SLICE_INDEX),
  ];

  const originalArgv = process.argv.slice(NODE_ARGV_SLICE_INDEX);

  return {
    jestArgv,
    originalArgv,
  };
}

/**
 * Finds the common base path by sorting the array and comparing the first and last element.
 * This leverages the fact that string sorting ensures the first and last elements
 * will have the maximum difference, so their common prefix is the common base for all paths.
 *
 * @param paths - Array of file/directory paths
 * @param sep - Path separator (defaults to OS separator)
 * @returns Common base path shared by all input paths
 */
export function commonBasePath(paths: string[] = [], sep = osSep): string {
  if (paths.length === 0) return '';

  const sortedPaths = paths.concat().sort();
  const firstPath = sortedPaths[0].split(sep);
  const lastPath = sortedPaths[sortedPaths.length - 1].split(sep);

  const maxLength = firstPath.length;
  let commonSegmentIndex = 0;

  while (
    commonSegmentIndex < maxLength &&
    firstPath[commonSegmentIndex] === lastPath[commonSegmentIndex]
  ) {
    commonSegmentIndex++;
  }

  return firstPath.slice(0, commonSegmentIndex).join(sep);
}

/**
 * Removes occurrences of a CLI flag (and its following value if present) from argv array.
 * Supports both --flag value and --flag=value forms.
 *
 * @param argv - Array of command line arguments
 * @param flag - Flag name (without the -- prefix)
 * @returns New array with the specified flag and its values removed
 */
function removeFlagFromArgv(argv: string[], flag: string): string[] {
  const filteredArguments: string[] = [];
  const longFlag = `--${flag}`;

  for (let i = 0; i < argv.length; i++) {
    const currentArgument = argv[i];

    if (currentArgument === longFlag) {
      // Skip this flag and its following value if it exists
      i += 1;
      continue;
    }

    if (currentArgument.startsWith(`${longFlag}=`)) {
      // Skip --flag=value format
      continue;
    }

    filteredArguments.push(currentArgument);
  }

  return filteredArguments;
}
