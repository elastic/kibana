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
import * as globby from 'globby';
import yargs from 'yargs';
import { SCOUT_REPORTER_ENABLED } from '@kbn/scout-info';
import objectHash from 'object-hash';
import type { Config } from '@jest/types';
import type { SlimAggregatedResult } from './types';
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

      // Effective retryFiles flag: honor --noRetryFiles if provided via argv
      const effectiveRetryFiles = flags.retryFiles ?? true;

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
              ![
                'group',
                'config',
                'c',
                'isolate',
                'retryFiles',
                'no-retryFiles',
                'noRetryFiles',
                'testRetries',
              ].includes(key) &&
              key !== '_' &&
              key !== '$0'
          )
        ),
      };

      // Treat positional args like Jest: as files/directories to limit which tests run
      const targetPaths: string[] = ((jestOnlyArgv._ || []) as unknown[])
        .map((v: unknown) => String(v))
        .filter((v: string) => v && v !== 'jest');

      // Expand glob patterns in positional args to concrete file/dir paths (unit groups pass patterns)
      const expandedTargetPaths: string[] = Array.from(
        new Set(
          targetPaths.flatMap((p) => globby.sync(p, { cwd: REPO_ROOT, absolute: true, dot: false }))
        )
      );
      const effectiveTargetPaths =
        expandedTargetPaths.length > 0 ? expandedTargetPaths : targetPaths;

      // --config is explicit; target paths must be provided positionally and are handled above

      // When no explicit configs are provided, try to discover configs by
      // walking upwards from each provided file/dir and looking for a jest.config.js
      if (list.length === 0 && effectiveTargetPaths.length > 0) {
        const discoveredConfigs = discoverNearestJestConfigs({
          targetPaths: effectiveTargetPaths,
          repoRoot: REPO_ROOT,
        });

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

      if (!flags.config && !list.length && effectiveTargetPaths.length === 0) {
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

      // Determine test-level retry count from flag (defaults to 3)
      // Flags are typed as unknown; coerce to number with fallback
      const testRetriesValue = Number(flags.testRetries ?? 3);
      const retriesFile = await writeRetriesFile({
        dataDir,
        retries: Number.isFinite(testRetriesValue) ? testRetriesValue : 3,
        log,
      });

      const jestArgv = yargs.options(yargsOptions).parse();

      const fullConfigs = await getFullConfigs({
        argv: jestArgv,
        configs: configsToRun,
        dataDir,
        log,
      });
      const runDataDir = Path.join(dataDir, objectHash(flags));

      await Fs.promises.mkdir(runDataDir, { recursive: true });

      const projectsPath = Path.join(runDataDir, 'projects.json');

      await Fs.promises.writeFile(
        projectsPath,
        JSON.stringify({
          projects: [fullConfigs.map((config, index) => configsToRun[index])],
        }),
        'utf-8'
      );

      log.info(`Projects to run: ${projectsPath}`);

      // Collect failures across all configs to report at the end
      const allFailures: Array<{
        configPath: string;
        failedFiles: Array<{
          path: string;
          failedTests: string[];
          failureMessage?: string;
        }>;
      }> = [];

      for (let i = 0; i < fullConfigs.length; i++) {
        const jestConfig = fullConfigs[i];

        const initialConfig = configsToRun[i];

        const setupFilesAfterEnv = [
          ...(jestConfig.projectConfig.setupFilesAfterEnv ?? []),
          retriesFile,
          ...(process.env.CI ? [] : [require.resolve('../setup/disable_console_logs')]),
        ];

        // Include targetPaths in the hash so runs with different path filters
        // get separate data directories and output files.
        const hash = objectHash({ initialConfig, targetPaths: effectiveTargetPaths });

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
          JSON.stringify(
            {
              ...initialRunConfig,
            },
            null,
            2
          ),
          'utf8'
        );

        // Set up environment for Jest
        if (SCOUT_REPORTER_ENABLED) {
          process.env.JEST_CONFIG_PATH = initialRunConfigFilepath;
        }

        // Include progress counter for configs
        log.info(`[${i + 1}/${fullConfigs.length}] Running Jest: ${initialRunConfigFilepath}`);

        log.debug(`Outfile should be ${initialRunResultsPath}`);

        const passthroughJestFlags = buildJestCliFlags(jestOnlyArgv);

        const initialRunResults = await runJestWithConfig({
          configPath: initialRunConfigFilepath,
          dataDir: dir,
          log,
          jestFlags: [
            ...passthroughJestFlags,
            ...(flags.isolate ? ['--bail'] : []),
            ...effectiveTargetPaths,
          ],
          resultsPath: initialRunResultsPath,
        });

        if (initialRunResults.testResults.numFailedTests === 0) {
          // all tests passed
          continue;
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

        if (!effectiveRetryFiles) {
          log.info('File-level retries disabled via flag; skipping retry loop.');
          const aggregated = initialRunResults.testResults as SlimAggregatedResult;
          if (aggregated.numFailedTests) {
            const failedFilesForConfig = aggregated.testResults
              .filter((tr) => tr.numFailingTests > 0)
              .map((tr) => ({
                path: tr.testFilePath,
                failedTests: (tr.testResults || [])
                  .filter((ar) => ar.status === 'failed')
                  .map((ar) => ar.fullName || ar.title || '(unnamed)'),
                failureMessage: tr.failureMessage,
              }));

            allFailures.push({
              configPath: initialRunConfigFilepath,
              failedFiles: failedFilesForConfig,
            });
          }
          continue;
        }

        log.warning('First attempt failed; starting scoped retries for failed test files...');

        // Helper to derive failed files from aggregated results
        const getFailedFiles = (agg: SlimAggregatedResult) =>
          agg.testResults.filter((tr) => tr.numFailingTests > 0).map((tr) => tr.testFilePath);

        // Stateful retry loop: run up to 3 more attempts, narrowing roots to applicable ones
        const maxRetries = 3;
        let attempt = 1; // retry attempt counter (initial run is attempt 0)
        let prevResults = initialRunResults.testResults as SlimAggregatedResult;
        let prevPassed = countPassedAssertions(prevResults);

        while (prevResults.numFailedTests > 0 && attempt <= maxRetries) {
          const failedFiles = getFailedFiles(prevResults);

          if (failedFiles.length === 0) {
            log.info('No failed files detected from previous run; stopping retries.');
            break;
          }

          log.info(
            `Retry attempt ${attempt}/${maxRetries} for ${initialRunConfigFilepath} with ${failedFiles.length} failed file(s)`
          );

          // Build a temporary retry config that limits roots to those containing the failed files
          let retryConfigPath = initialRunConfigFilepath;
          const originalRoots = (initialRunConfig.roots || []) as string[];
          if (originalRoots.length > 0) {
            const baseRootDir = initialRunConfig.rootDir
              ? Path.resolve(String(initialRunConfig.rootDir))
              : REPO_ROOT;
            const normalizedRoots = originalRoots.map((r) => {
              const replaced = r.includes('<rootDir>') ? r.replace(/<rootDir>/g, baseRootDir) : r;
              return Path.isAbsolute(replaced)
                ? Path.resolve(replaced)
                : Path.resolve(baseRootDir, replaced);
            });
            const selectedRoots = new Set<string>();
            for (const f of failedFiles) {
              const abs = Path.resolve(f);
              const containing = normalizedRoots
                .filter((r) => abs.startsWith(r + Path.sep) || abs === r)
                .sort((a, b) => b.length - a.length)[0];
              if (containing) selectedRoots.add(containing);
            }

            const rootsForRetry =
              selectedRoots.size > 0 ? Array.from(selectedRoots) : normalizedRoots;
            const retryRunConfig = {
              ...initialRunConfig,
              roots: rootsForRetry,
            } as Config.InitialOptions;

            retryConfigPath = Path.join(dir, `jest.config.retry.${attempt}.json`);
            await Fs.promises.writeFile(
              retryConfigPath,
              JSON.stringify(retryRunConfig, null, 2),
              'utf8'
            );
          }

          // Use the same flags as the initial run (no forced in-band, no maxWorkers tweaks)
          const retryFlags = [...passthroughJestFlags];

          const retryResultsPath = Path.join(dir, `retry_${attempt}_results.json`);
          const retryResult = await runJestWithConfig({
            configPath: retryConfigPath,
            dataDir: dir,
            log,
            jestFlags: [
              ...retryFlags,
              // Re-run exactly the failed files from the previous run
              ...failedFiles,
            ],
            resultsPath: retryResultsPath,
          });

          const agg = retryResult.testResults as SlimAggregatedResult;
          if (agg.numFailedTests === 0) {
            log.success('All tests passed after retry');
            prevResults = agg;
            break;
          }

          // Only retry again if fewer tests passed than the previous run
          const currPassed = countPassedAssertions(agg);
          if (currPassed < prevPassed && attempt < maxRetries) {
            log.warning(
              `Retry attempt ${attempt} passed fewer tests (${currPassed}) than previous (${prevPassed}); retrying again...`
            );
            prevPassed = currPassed;
            prevResults = agg;
            attempt++;
            continue;
          }

          // Stop retrying; either pass count didn't decrease or max attempts reached
          if (currPassed >= prevPassed) {
            log.info(
              `Retry attempt ${attempt} did not reduce passed tests count (${currPassed} >= ${prevPassed}); stopping further retries.`
            );
          }
          prevResults = agg;
          break;
        }

        if (prevResults.numFailedTests) {
          // Collect failing details for this config and continue with next config
          const aggregated = prevResults as SlimAggregatedResult;
          const failedFilesForConfig = aggregated.testResults
            .filter((tr) => tr.numFailingTests > 0)
            .map((tr) => ({
              path: tr.testFilePath,
              failedTests: (tr.testResults || [])
                .filter((ar) => ar.status === 'failed')
                .map((ar) => ar.fullName || ar.title || '(unnamed)'),
              failureMessage: tr.failureMessage,
            }));

          allFailures.push({
            configPath: initialRunConfigFilepath,
            failedFiles: failedFilesForConfig,
          });
        } else {
          log.success(`All tests passed`);
        }
      }

      // After running all configs, report any failures and fail the process
      if (allFailures.length > 0) {
        let totalFailedTests = 0;
        for (const entry of allFailures) {
          log.error(`Failures in config: ${entry.configPath}`);
          for (const f of entry.failedFiles) {
            totalFailedTests += f.failedTests.length || 1;
            log.error(`  ${f.path}`);
            if (f.failureMessage) {
              log.error(`    ${f.failureMessage.split('\n')[0]}`);
            }
            for (const name of f.failedTests) {
              log.error(`    ✖ ${name}`);
            }
          }
        }
        throw new Error(
          `${totalFailedTests} test(s) failed across ${allFailures.length} config(s)`
        );
      }
    },
    {
      flags: {
        boolean: ['group', 'isolate', 'retryFiles'],
        string: ['config'],
        number: ['testRetries'],
        alias: {
          c: 'config',
        },
        allowUnexpected: true,
        default: {
          group: true,
          retryFiles: true,
          testRetries: 3,
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
 * Remove a flag that takes a value, e.g. ['--maxWorkers','4'] → removed both.
 */
// Count the number of passed assertions from a SlimAggregatedResult
function countPassedAssertions(agg: SlimAggregatedResult): number {
  let passed = 0;
  for (const tr of agg.testResults) {
    for (const ar of tr.testResults || []) {
      if (ar.status === 'passed') {
        passed++;
      }
    }
  }
  return passed;
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
