/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Keep the baseline runtime hardening and warning behavior from setup-node-env,
// but avoid loading babel/register.
require('../src/setup_node_env/setup_env.js');
require('../src/setup_node_env/dns_ipv4_first.js');

const { resolve, relative, sep: osSep, join } = require('node:path');
const { promises: fs, existsSync } = require('node:fs');
const { run } = require('jest');
const { readInitialOptions } = require('jest-config');
const getopts = require('getopts');
const { execFile, execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { REPO_ROOT } = require('@kbn/repo-info');

const jestFlags = require('../src/platform/packages/shared/kbn-test/src/jest/jest_flags.json');

const JEST_CACHE_DIR = 'data/jest-cache';
const NODE_ARGV_SLICE_INDEX = 2;
const SHARD_ANNOTATION_SEP = '||shard=';
const SCOUT_REPORTER_ENABLED = booleanFromEnv('SCOUT_REPORTER_ENABLED');

interface ParsedArguments extends Record<string, unknown> {
  _: Array<string | number>;
  config?: string;
  help?: boolean;
  testPathPattern?: string;
  verbose?: boolean;
  shard?: string;
}

function booleanFromEnv(varName: string, defaultValue = false): boolean {
  const envValue = process.env[varName];
  if (envValue === undefined || envValue.trim().length === 0) {
    return defaultValue;
  }

  return ['1', 'yes', 'true'].includes(envValue.trim().toLowerCase());
}

function createLogger(parsedArguments: ParsedArguments) {
  const verboseEnabled = Boolean(parsedArguments.verbose);

  return {
    verbose(...args: unknown[]) {
      if (verboseEnabled) {
        console.log(...args);
      }
    },
    debug(...args: unknown[]) {
      if (verboseEnabled) {
        console.log(...args);
      }
    },
    info(...args: unknown[]) {
      console.log(...args);
    },
    warning(...args: unknown[]) {
      console.warn(...args);
    },
    error(...args: unknown[]) {
      console.error(...args);
    },
  };
}

function createFailError(message: string, exitCode = 1) {
  return Object.assign(new Error(message), { exitCode });
}

function parseShardAnnotation(name: string): { config: string; shard?: string } {
  const separatorIndex = name.indexOf(SHARD_ANNOTATION_SEP);
  if (separatorIndex === -1) {
    return { config: name };
  }

  return {
    config: name.substring(0, separatorIndex),
    shard: name.substring(separatorIndex + SHARD_ANNOTATION_SEP.length),
  };
}

function isInBuildkite(): boolean {
  return Boolean(process.env.BUILDKITE);
}

function getCheckpointKey(config: string): string {
  const stepId = process.env.BUILDKITE_STEP_ID || '';
  const job = process.env.BUILDKITE_PARALLEL_JOB || '0';
  const hash = createHash('sha256').update(config).digest('hex').substring(0, 12);
  return `jest_ckpt_${stepId}_${job}_${hash}`;
}

function execBuildkiteAgent(args: string[]): Promise<{ stdout: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    execFile('buildkite-agent', args, (error: Error | null, stdout: string) => {
      if (error) {
        rejectPromise(error);
      } else {
        resolvePromise({ stdout });
      }
    });
  });
}

async function isConfigCompleted(config: string): Promise<boolean> {
  try {
    const { stdout } = await execBuildkiteAgent([
      'meta-data',
      'get',
      getCheckpointKey(config),
      '--default',
      '',
    ]);
    return stdout.trim() === 'done';
  } catch {
    return false;
  }
}

function markConfigCompletedSync(config: string): void {
  try {
    execFileSync('buildkite-agent', ['meta-data', 'set', getCheckpointKey(config), 'done'], {
      stdio: 'pipe',
    });
  } catch {
    // best-effort checkpoint write
  }
}

function parseJestArguments(): {
  parsedArguments: ParsedArguments;
  unknownFlags: string[];
} {
  const unknownFlags: string[] = [];
  const parsedArguments = getopts(process.argv.slice(NODE_ARGV_SLICE_INDEX), {
    ...jestFlags,
    unknown(flag: string) {
      unknownFlags.push(flag);
      return false;
    },
  }) as ParsedArguments;

  if (parsedArguments.help) {
    run();
    process.exit(0);
  }

  if (unknownFlags.length > 0) {
    const flagsList = unknownFlags.join(', ');
    throw createFailError(`unexpected flag: ${flagsList}

  If this flag is valid you might need to update the flags in "scripts/jest.ts".

  Run 'yarn jest --help | node scripts/read_jest_help.cjs' to update this script's knowledge of what
  flags jest supports

`);
  }

  return { parsedArguments, unknownFlags };
}

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

function discoverJestConfig(
  testFiles: string[],
  currentWorkingDirectory: string,
  configName: string,
  log: ReturnType<typeof createLogger>
): string {
  const commonTestFiles = commonBasePath(testFiles);
  const testFilesProvided = testFiles.length > 0;

  log.verbose('cwd:', currentWorkingDirectory);
  log.verbose('testFiles:', testFiles.join(', '));
  log.verbose('commonTestFiles:', commonTestFiles);

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

async function resolveJestConfig(
  parsedArguments: ParsedArguments,
  resolvedConfigPath?: string
): Promise<{ config: Record<string, unknown>; configPath: string | undefined }> {
  let initialOptions: Record<string, unknown> | undefined;

  if (parsedArguments.config) {
    try {
      initialOptions = JSON.parse(parsedArguments.config);
    } catch {
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

    initialOptions = (await readInitialOptions(resolvedConfigPath!)).config;
  }

  return { config: initialOptions, configPath: resolvedConfigPath };
}

async function prepareJestExecution(baseConfig: Record<string, unknown>): Promise<{
  jestArgv: string[];
  originalArgv: string[];
}> {
  const cacheDirectory = join(REPO_ROOT, JEST_CACHE_DIR);

  const inlineConfig = {
    ...baseConfig,
    id: 'kbn-test-jest',
    cacheDirectory,
  };

  await fs.mkdir(cacheDirectory, { recursive: true });

  const argumentsWithoutConfig = removeFlagFromArgv(process.argv, 'config');

  const jestArgv = [
    '--config',
    JSON.stringify(inlineConfig),
    ...argumentsWithoutConfig.slice(NODE_ARGV_SLICE_INDEX),
  ];

  const originalArgv = process.argv.slice(NODE_ARGV_SLICE_INDEX);

  return {
    jestArgv,
    originalArgv,
  };
}

function commonBasePath(paths: string[] = [], sep = osSep): string {
  if (paths.length === 0) {
    return '';
  }

  const sortedPaths = paths.concat().sort();
  const firstPath = sortedPaths[0].split(sep);
  const lastPath = sortedPaths[sortedPaths.length - 1].split(sep);

  const maxLength = firstPath.length;
  let commonSegmentIndex = 0;

  while (
    commonSegmentIndex < maxLength &&
    firstPath[commonSegmentIndex] === lastPath[commonSegmentIndex]
  ) {
    commonSegmentIndex += 1;
  }

  return firstPath.slice(0, commonSegmentIndex).join(sep);
}

function removeFlagFromArgv(argv: string[], flag: string): string[] {
  const filteredArguments: string[] = [];
  const longFlag = `--${flag}`;

  for (let i = 0; i < argv.length; i += 1) {
    const currentArgument = argv[i];

    if (currentArgument === longFlag) {
      i += 1;
      continue;
    }

    if (currentArgument.startsWith(`${longFlag}=`)) {
      continue;
    }

    filteredArguments.push(currentArgument);
  }

  return filteredArguments;
}

function createReportTime() {
  return async (_startTime: number, _id: string, _meta: Record<string, unknown>) => {
    // no-op: metrics reporting previously came from @kbn/ci-stats-reporter,
    // which currently requires babel-enabled package loading.
  };
}

async function runJest(configName = 'jest.config.js'): Promise<void> {
  const { parsedArguments } = parseJestArguments();
  const log = createLogger(parsedArguments);

  const runStartTime = Date.now();
  const reportTime = createReportTime();

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }

  if (parsedArguments.config) {
    const { config: cleanConfig, shard } = parseShardAnnotation(parsedArguments.config);
    if (shard) {
      parsedArguments.config = cleanConfig;
      parsedArguments.shard = shard;

      for (let i = 0; i < process.argv.length; i += 1) {
        if (process.argv[i] === '--config' && i + 1 < process.argv.length) {
          process.argv[i + 1] = cleanConfig;
          break;
        }

        if (process.argv[i].startsWith('--config=')) {
          process.argv[i] = `--config=${cleanConfig}`;
          break;
        }
      }

      process.argv.push('--shard', shard);
      log.info(`Parsed shard annotation: config=${cleanConfig}, shard=${shard}`);
    }
  }

  const currentWorkingDirectory = process.env.INIT_CWD || process.cwd();
  let testFiles: string[] = [];
  let resolvedConfigPath = parsedArguments.config ?? '';

  if (isInBuildkite() && resolvedConfigPath) {
    const relConfigForCheckpoint = relative(REPO_ROOT, resolvedConfigPath);
    log.info(
      `[jest-checkpoint] Checking prior completion for ${relConfigForCheckpoint} (step=${
        process.env.BUILDKITE_STEP_ID || ''
      }, job=${process.env.BUILDKITE_PARALLEL_JOB || '0'}, retry=${
        process.env.BUILDKITE_RETRY_COUNT || '0'
      })`
    );

    const alreadyCompleted = await isConfigCompleted(relConfigForCheckpoint);
    if (alreadyCompleted) {
      log.info(
        `[jest-checkpoint] Skipping ${relConfigForCheckpoint} (already completed on previous attempt)`
      );
      process.exit(0);
    }

    log.info('[jest-checkpoint] No prior checkpoint found, running config');
  }

  if (!parsedArguments.config) {
    testFiles = parsedArguments._.map((pathValue: string) =>
      resolve(currentWorkingDirectory, pathValue.toString())
    );

    if (parsedArguments.testPathPattern) {
      testFiles.push(parsedArguments.testPathPattern);
    }

    resolvedConfigPath = discoverJestConfig(testFiles, currentWorkingDirectory, configName, log);
    process.argv.push('--config', resolvedConfigPath);

    const testFilesProvided = testFiles.length > 0;
    if (!testFilesProvided) {
      log.verbose('no test files provided, setting to current directory');
      const commonTestFiles = commonBasePath(testFiles);
      const workingDirectory = testFilesProvided ? commonTestFiles : currentWorkingDirectory;
      process.argv.push(relative(workingDirectory, currentWorkingDirectory));
    }
  }

  const { config: baseConfig, configPath } = await resolveJestConfig(
    parsedArguments,
    resolvedConfigPath
  );

  if (SCOUT_REPORTER_ENABLED) {
    if (configPath) {
      process.env.JEST_CONFIG_PATH = configPath;
    } else {
      log.warning('JEST_CONFIG_PATH not set because the Jest config path could not be determined');
    }
  }

  log.debug('Setting up Jest with shared cache directory...');

  const { originalArgv, jestArgv } = await prepareJestExecution(baseConfig);

  log.info('yarn jest', originalArgv.join(' '));
  log.debug('Setting up Jest with shared cache directory:', jestArgv.join(' '));

  return run(jestArgv).then(async () => {
    await reportTime(runStartTime, 'total', {
      success: true,
      isXpack: currentWorkingDirectory.includes('x-pack'),
      testFiles: testFiles.map((testFile) => relative(currentWorkingDirectory, testFile)),
    });

    if (isInBuildkite() && resolvedConfigPath) {
      const relConfig = relative(REPO_ROOT, resolvedConfigPath);
      process.on('exit', () => {
        if (!process.exitCode) {
          log.info(`[jest-checkpoint] Marking ${relConfig} as completed`);
          markConfigCompletedSync(relConfig);
        }
      });
    }
  });
}

function exitOnFatalError(error: unknown): never {
  if (error instanceof Error) {
    console.error(error.stack || error.message);
    const exitCode = (error as Error & { exitCode?: number }).exitCode ?? 1;
    process.exit(exitCode);
  }

  console.error(error);
  process.exit(1);
}

module.exports = {
  runJest,
};

if (require.main === module) {
  runJest().catch(exitOnFatalError);
}
