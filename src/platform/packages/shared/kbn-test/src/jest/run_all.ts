/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative, dirname, resolve, isAbsolute } from 'path';

import getopts from 'getopts';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { SCOUT_REPORTER_ENABLED } from '@kbn/scout-info';
import { readConfig } from 'jest-config';
import fg from 'fast-glob';
import type { Config } from '@jest/types';

interface JestConfigResult {
  config: string;
  code: number;
  durationMs: number;
}

async function runConfigs(
  configs: string[],
  maxParallel: number,
  log: ToolingLog
): Promise<JestConfigResult[]> {
  const results: JestConfigResult[] = [];
  let active = 0;
  let index = 0;

  await new Promise<void>((resolveAll) => {
    const launchNext = () => {
      while (active < maxParallel && index < configs.length) {
        const config = configs[index++];
        const start = Date.now();
        active += 1;

        const args = [
          'scripts/jest',
          '--config',
          config,
          '--passWithNoTests',
          '--runInBand',
          '--coverage=false',
        ];

        if (SCOUT_REPORTER_ENABLED) {
          process.env.JEST_CONFIG_PATH = config;
        }

        const proc = spawn(process.execPath, args, {
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let buffer = '';

        proc.stdout.on('data', (d) => {
          buffer += d.toString();
        });
        proc.stderr.on('data', (d) => {
          buffer += d.toString();
        });

        proc.on('exit', (c) => {
          const code = c == null ? 1 : c;
          const durationMs = Date.now() - start;
          results.push({ config, code, durationMs });

          // Print buffered output after completion to keep logs grouped per config
          const sec = Math.round(durationMs / 1000);
          // eslint-disable-next-line no-console
          console.log(`\n+++ Output for ${config} (exit ${code}, ${sec}s)\n` + buffer + '\n');

          active -= 1;
          if (index < configs.length) {
            launchNext();
          } else if (active === 0) {
            resolveAll();
          }
        });
      }
    };
    launchNext();
  });

  return results;
}

// Run multiple Jest configs in parallel using separate Jest processes (one per config).
// We explicitly disable Jest's own worker pool for each process using --runInBand to avoid
// nested parallelism and contention; overall parallelism is handled here at the config level.
//
// Flags:
//   --configs       Comma-separated list of jest config file paths (required)
//   --maxParallel   Maximum concurrent Jest config processes (optional, defaults to env JEST_MAX_PARALLEL or 3)
//   (Removed legacy --parallelism flag; each config always runs with --runInBand)
export async function runJestAll() {
  const argv = getopts(process.argv.slice(2), {
    string: ['configs', 'maxParallel'],
    alias: {},
    default: {},
  });

  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
  const reporter = getTimeReporter(log, 'scripts/jest_all');
  const startAll = Date.now();

  const configsArg: string | undefined = argv.configs;
  const maxParallelRaw: string | undefined = argv.maxParallel || process.env.JEST_MAX_PARALLEL;
  const maxParallel = Math.max(1, parseInt(maxParallelRaw || '3', 10));

  if (!configsArg) {
    log.error('--configs flag is required (comma-separated list of jest config paths)');
    process.exit(1);
  }

  const configPaths = configsArg
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  if (!configPaths.length) {
    log.error('No configs found after parsing --configs');
    process.exit(1);
  }

  interface ResolvedConfigMeta {
    path: string;
    options: Config.ProjectConfig; // fully materialized jest config
    matchedTests: string[];
  }

  const resolvedConfigs: ResolvedConfigMeta[] = [];
  const skippedConfigs: string[] = [];

  const disableFilter = process.env.JEST_ALL_DISABLE_FILTER === 'true';
  for (const cfgPath of configPaths) {
    try {
      // readConfig fully materializes the Jest configuration (resolving preset/extends, etc.)
      const loaded = await readConfig({} as any, cfgPath);
      const jestConfig = loaded.projectConfig;
      const configDir = dirname(cfgPath);
      // If rootDir is provided and relative, resolve it against the config file directory
      const rootDir = jestConfig.rootDir
        ? isAbsolute(jestConfig.rootDir)
          ? jestConfig.rootDir
          : resolve(configDir, jestConfig.rootDir)
        : configDir;

      const testMatch: string[] = Array.isArray(jestConfig.testMatch) ? jestConfig.testMatch : [];

      const testRegex: (string | RegExp)[] = Array.isArray(jestConfig.testRegex)
        ? jestConfig.testRegex
        : jestConfig.testRegex
        ? [jestConfig.testRegex]
        : [];

      const roots: string[] = Array.isArray(jestConfig.roots) ? jestConfig.roots : [];

      const searchRoots = roots.length
        ? roots.map((r) => (isAbsolute(r) ? r : resolve(rootDir, r)))
        : [rootDir];

      log.verbose?.(
        `Config ${cfgPath} using ${searchRoots.length} root(s): ${searchRoots
          .map((r) => relative(process.cwd(), r))
          .join(', ')}`
      );

      const matches: string[] = [];

      if (testMatch.length > 0) {
        for (const sr of searchRoots) {
          const normalized = testMatch.map((p) => {
            if (p.startsWith('<rootDir>/')) return p.replace('<rootDir>/', '');
            if (p.startsWith('<rootDir>')) return p.replace('<rootDir>', '');
            return p;
          });
          const found = await fg(normalized, { onlyFiles: true, cwd: sr, absolute: true });
          if (found.length) {
            matches.push(...found);
          }
        }
      }

      if (matches.length === 0 && testRegex.length > 0) {
        const regs = testRegex.map((r) => (r instanceof RegExp ? r : new RegExp(r)));
        for (const sr of searchRoots) {
          const candidateFiles = await fg(['**/*.{js,ts,jsx,tsx}'], { cwd: sr, onlyFiles: true });
          const filtered = candidateFiles
            .filter((f) => regs.some((re) => re.test(f)))
            .map((f) => resolve(sr, f));
          if (filtered.length) {
            matches.push(...filtered);
          }
        }
      }

      if (matches.length === 0) {
        log.debug?.(
          `No tests found for config ${cfgPath} rootDir=${rootDir} patterns=${testMatch.join(',')}`
        );
        if (!disableFilter) {
          skippedConfigs.push(cfgPath);
          continue;
        } else {
          log.info(
            `No matching tests, but including config due to JEST_ALL_DISABLE_FILTER=true: ${cfgPath}`
          );
        }
      } else {
        log.verbose?.(`Config ${cfgPath} matched ${matches.length} tests`);
      }
      resolvedConfigs.push({ path: cfgPath, options: jestConfig, matchedTests: matches });
    } catch (e) {
      log.warning(`Failed to read config ${cfgPath}: ${(e as Error).message}. Including anyway.`);
      resolvedConfigs.push({
        path: cfgPath,
        // Minimal fallback; jestConfig failed to load. Only rootDir is required for relative path logging.
        // @ts-expect-error intentionally partial ProjectConfig fallback
        options: { rootDir: process.cwd() },
        matchedTests: [],
      });
    }
  }

  if (skippedConfigs.length) {
    log.info('Configs skipped (no matching test files):');
    for (const s of skippedConfigs) {
      log.info(`  - ${s}`);
    }
  }

  const configs = resolvedConfigs.map((r) => r.path);
  if (configs.length === 0) {
    log.info('All provided configs were skipped (no tests). Exiting successfully.');
    process.exit(0);
  }

  log.info(
    `Launching up to ${maxParallel} parallel Jest config processes (forcing --runInBand per process).`
  );
  // legacy --parallelism flag removed

  // First pass
  const firstPass = await runConfigs(configs, maxParallel, log);
  let failing = firstPass.filter((r) => r.code !== 0).map((r) => r.config);

  let retryResults: JestConfigResult[] = [];
  if (failing.length > 0) {
    log.info('--- Detected failing configs, starting retry pass (maxParallel=1)');
    retryResults = await runConfigs(failing, 1, log);

    const fixed = retryResults.filter((r) => r.code === 0).map((r) => r.config);
    const stillFailing = retryResults.filter((r) => r.code !== 0).map((r) => r.config);
    if (fixed.length) {
      log.info('Configs fixed after retry:');
      for (const f of fixed) log.info(`  - ${f}`);
    }
    if (stillFailing.length) {
      log.info('Configs still failing after retry:');
      for (const f of stillFailing) log.info(`  - ${f}`);
    }
    failing = stillFailing; // update failing list to post-retry
  }

  const results = retryResults.length
    ? // merge: prefer retry result for retried configs
      firstPass.map((r) => {
        const retried = retryResults.find((rr) => rr.config === r.config);
        return retried ? retried : r;
      })
    : firstPass;

  const globalExit = failing.length > 0 ? 10 : 0; // maintain previous non-zero code

  const totalMs = Date.now() - startAll;
  reporter(startAll, 'total', {
    success: globalExit === 0,
    testFiles: results.map((r) => relative(process.cwd(), r.config)),
  });

  // Persist failed configs for retry logic if requested
  if (process.env.JEST_ALL_FAILED_CONFIGS_PATH) {
    const failed = results.filter((r) => r.code !== 0).map((r) => r.config);
    try {
      await fs.mkdir(dirname(process.env.JEST_ALL_FAILED_CONFIGS_PATH), { recursive: true });
      await fs.writeFile(
        process.env.JEST_ALL_FAILED_CONFIGS_PATH,
        JSON.stringify(failed, null, 2),
        'utf8'
      );
    } catch (err) {
      log.warning(`Unable to write failed configs file: ${(err as Error).message}`);
    }
  }

  log.info('--- Combined Jest run summary');
  for (const r of results) {
    const sec = Math.round(r.durationMs / 1000);
    log.info(`  - ${r.config} : exit ${r.code} (${sec}s)`);
  }
  log.info(`Total duration: ${Math.round(totalMs / 1000)}s`);

  process.exit(globalExit);
}
