/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { yargsOptions } from 'jest-cli';
import { readConfig, readInitialOptions } from 'jest-config';
import { castArray } from 'lodash';
import pLimit from 'p-limit';
import yargs from 'yargs';
import { SCOUT_REPORTER_ENABLED } from '@kbn/scout-info';
import objectHash from 'object-hash';
import type { Config } from '@jest/types';
import { expandConfigPaths } from './expand_config_paths';
import { getFullConfigs } from './get_full_configs';
import { groupConfigs } from './group_configs';
import { writeRetriesFile } from './write_retries_file';
import { isolateFailures } from './isolate_failures';
import { runJestWithConfig } from './run_jest_with_config';

/**
 * Polls for the results file to be ready and contain valid JSON data
 */

export function runJestAll() {
  run(
    async ({ flags, log }) => {
      // Import default Jest configuration
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const defaultJestConfig = require('./run_jest_all.config') as Config.InitialOptions;

      let list: string[] = [];

      if (flags.config) {
        // --config can be provided multiple times or as a comma-separated list
        const raw = castArray(flags.config)
          .flatMap((v) => String(v).split(','))
          .map((v) => v.trim())
          .filter(Boolean);

        for (const candidate of raw) {
          const base = Path.basename(candidate);
          const looksLikeJestConfig = base === 'jest.config.js' || base === 'jest.config.ts';
          if (!looksLikeJestConfig) {
            throw new Error(
              `--config accepts only explicit jest config files (jest.config.js|ts). Invalid: ${candidate}. If you intended a test path, pass it positionally (after --) or omit --config.`
            );
          }
          list.push(candidate);
        }
      }
      // Remove all our custom flags (defined in the flags config) before passing to Jest's readConfig
      // Only keep `_` from yargs.argv and filter out: group, config, c (alias)
      const originalArgv = yargs.argv as any;
      const jestOnlyArgv = {
        _: originalArgv._,
        $0: originalArgv.$0 || 'jest', // Required by Jest's Argv interface
        // Filter out all keys that are in our flags config
        ...Object.fromEntries(
          Object.entries(originalArgv).filter(
            ([key]) =>
              !['group', 'config', 'c', 'isolate'].includes(key) && key !== '_' && key !== '$0'
          )
        ),
      };

      // Treat positional args like Jest: as files/directories to limit which tests run
      const targetPaths: string[] = ((jestOnlyArgv._ || []) as unknown[])
        .map((v: unknown) => String(v))
        .filter((v: string) => v && v !== 'jest');

      // --config is explicit; target paths must be provided positionally and are handled above

      // When no explicit configs are provided, try to discover configs by
      // walking upwards from each provided file/dir and looking for a jest.config.js
      if (list.length === 0 && targetPaths.length > 0) {
        const discoveredConfigs = discoverNearestJestConfigs({ targetPaths, repoRoot: REPO_ROOT });

        if (discoveredConfigs.length > 0) {
          log.debug(
            `Auto-discovered ${
              discoveredConfigs.length
            } jest configs from target paths: ${discoveredConfigs.join(', ')}`
          );
          list.push(...discoveredConfigs);
        }
      }

      list = expandConfigPaths(list);

      log.debug(`Found ${list.length} configs`);

      if (flags.config && !list.length) {
        // --config was provided but nothing resolved
        throw new Error(
          `No config paths found for --config. Provide explicit jest.config.js|ts files.`
        );
      }

      if (!flags.config && !list.length && targetPaths.length === 0) {
        // No configs resolved and no files/dirs provided
        throw new Error('No configs provided. Use --config <path1,path2,...> or pass files/dirs');
      }

      const limiter = pLimit(50);

      const dataDir = Path.join(REPO_ROOT, 'data', 'jest-run-all');

      await Fs.promises.mkdir(dataDir, { recursive: true });

      const { globalConfig } = await readConfig(
        jestOnlyArgv,
        require.resolve('./run_jest_all.config.js')
      );

      const configs = list.length
        ? await Promise.all(
            list.map(async (configPath) => {
              return await limiter(() => readInitialOptions(configPath));
            })
          )
        : [];

      // If no explicit configs are provided but users pass positional paths (files/dirs),
      // fall back to the default Jest config so we can still run a targeted test selection.
      const configsToRun: Config.InitialOptions[] = list.length
        ? flags.group
          ? groupConfigs({
              log,
              globalConfig,
              configs,
            })
          : configs.map((cfg) => cfg.config)
        : [defaultJestConfig];

      log.info(`Running ${configsToRun.length} configs`);

      const retriesFile = await writeRetriesFile({ dataDir, retries: 3, log });

      const jestArgv = yargs.options(yargsOptions).parse();

      const fullConfigs = await getFullConfigs({
        argv: jestArgv,
        configs: configsToRun,
        dataDir,
        log,
      });

      for (let i = 0; i < fullConfigs.length; i++) {
        const jestConfig = fullConfigs[i];

        const initialConfig = configsToRun[i];

        const setupFilesAfterEnv = [
          ...(jestConfig.projectConfig.setupFilesAfterEnv ?? []),
          retriesFile,
        ];

        // Include targetPaths in the hash so runs with different path filters
        // get separate data directories and output files.
        const hash = objectHash({ initialConfig, targetPaths });

        const dir = Path.join(dataDir, hash);

        const initialRunResultsPath = Path.join(dir, `initial_results.json`);

        const initialRunConfig = {
          ...initialConfig,
          ...defaultJestConfig,
          setupFilesAfterEnv,
          reporters: ['default', require.resolve('./json_reporter')],
        };

        await Fs.promises.mkdir(dir, { recursive: true });

        const initialRunConfigFilepath = Path.join(dir, `jest.config.initial.json`);

        await Fs.promises.writeFile(
          initialRunConfigFilepath,
          JSON.stringify(initialRunConfig),
          'utf8'
        );

        // Set up environment for Jest
        if (SCOUT_REPORTER_ENABLED) {
          process.env.JEST_CONFIG_PATH = initialRunConfigFilepath;
        }

        log.info(`Running Jest with retries for ${initialRunConfigFilepath}...`);

        log.debug(`Outfile should be ${initialRunResultsPath}`);

        const passthroughJestFlags = buildJestCliFlags(jestOnlyArgv);

        const initialRunResults = await runJestWithConfig({
          configPath: initialRunConfigFilepath,
          dataDir: dir,
          log,
          jestFlags: [
            ...passthroughJestFlags,
            '--outputFile',
            initialRunResultsPath,
            ...(flags.isolate ? ['--bail'] : []),
            ...targetPaths,
          ],
          resultsPath: initialRunResultsPath,
        });

        if (initialRunResults.testResults.numFailedTests === 0) {
          // all tests passed
          return;
        }

        if (flags.isolate) {
          // In isolation mode, start isolation process immediately on first failure
          log.warning('Test failure detected, starting isolation process immediately...');

          const failedTestPath = initialRunResults.testResults.testResults.find((testResult) => {
            return testResult.numFailingTests > 0;
          })?.testFilePath;

          if (!failedTestPath) {
            throw new Error(`Could not determine failed test path`);
          }

          await isolateFailures({
            config: initialRunConfig,
            dataDir: dir,
            log,
            failedTestPath,
            initialRunResults: initialRunResults.testResults,
          });

          process.exit(1);
        }

        log.warning('First attempt failed, retrying failed test files only...');

        log.info(`Running Jest retry for failed files using ${initialRunConfigFilepath}...`);

        // Derive failed test files from the initial aggregated results
        const failedFiles = initialRunResults.testResults.testResults
          .filter((tr) => tr.numFailingTests > 0)
          .map((tr) => tr.testFilePath);

        if (failedFiles.length === 0) {
          log.info('No failed files detected in initial run; skipping retry run.');
          continue;
        }

        const secondRunResultsPath = Path.join(dir, `second_results.json`);

        const secondRunResult = await runJestWithConfig({
          configPath: initialRunConfigFilepath,
          dataDir: dir,
          log,
          jestFlags: [
            ...passthroughJestFlags,
            '--runInBand',
            '--outputFile',
            secondRunResultsPath,
            // Re-run exactly the failed files from the initial run
            ...failedFiles,
          ],
          resultsPath: secondRunResultsPath,
        });

        if (secondRunResult.testResults.numFailedTests) {
          throw new Error(`${secondRunResult.testResults.numFailedTests} tests failed`);
        }

        log.success(`All tests passed`);
      }
    },
    {
      flags: {
        boolean: ['group', 'isolate'],
        string: ['config'],
        alias: {
          c: 'config',
        },
        allowUnexpected: true,
        default: {
          group: true,
        },
      } as const,
    }
  );
}

/**
 * Convert a yargs-parsed argv object (filtered for Jest-only options) into
 * an array of CLI flags for passing to the Jest child process.
 * - Excludes positional (_), $0
 * - Supports booleans, strings/numbers, and arrays
 */
function buildJestCliFlags(argv: Record<string, unknown>): string[] {
  const flags: string[] = [];
  for (const [key, value] of Object.entries(argv)) {
    if (key === '_' || key === '$0') continue;

    if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'boolean') {
          if (v) flags.push(`--${key}`);
          else flags.push(`--no-${key}`);
        } else if (v != null) {
          flags.push(`--${key}`, String(v));
        }
      }
      continue;
    }

    if (typeof value === 'boolean') {
      if (value) flags.push(`--${key}`);
      else flags.push(`--no-${key}`);
      continue;
    }

    if (value != null) {
      flags.push(`--${key}`, String(value));
    }
  }
  return flags;
}

/**
 * Discover nearest jest.config.js files by walking upwards from each provided target path.
 * Only checks the directory itself and each parent (not recursive into children).
 */
function discoverNearestJestConfigs({
  targetPaths,
  repoRoot,
}: {
  targetPaths: string[];
  repoRoot: string;
}): string[] {
  const discovered = new Set<string>();

  for (const inputPath of targetPaths) {
    // Normalize to an absolute path inside the repo when given as repo-relative
    let absolutePath: string;
    if (Path.isAbsolute(inputPath)) {
      if (inputPath.startsWith(repoRoot)) {
        absolutePath = inputPath;
      } else {
        // Treat absolute-but-not-under-repo paths like repo-relative with leading '/'
        absolutePath = Path.join(repoRoot, inputPath.replace(/^\/+/, ''));
      }
    } else {
      absolutePath = Path.join(repoRoot, inputPath);
    }

    // Determine starting directory: if a file, use its directory; if a dir, use as-is
    let currentDir =
      Fs.existsSync(absolutePath) && Fs.statSync(absolutePath).isDirectory()
        ? absolutePath
        : Path.dirname(absolutePath);

    // Walk upwards until reaching repo root
    while (currentDir && currentDir.startsWith(repoRoot)) {
      const candidate = Path.join(currentDir, 'jest.config.js');
      if (Fs.existsSync(candidate) && Fs.statSync(candidate).isFile()) {
        discovered.add(candidate);
      }

      if (currentDir === repoRoot) {
        break;
      }

      const nextDir = Path.dirname(currentDir);
      if (nextDir === currentDir) {
        break;
      }
      currentDir = nextDir;
    }
  }

  return Array.from(discovered);
}
