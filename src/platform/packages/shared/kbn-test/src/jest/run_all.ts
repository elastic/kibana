/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';
import { spawn } from 'child_process';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { relative } from 'path';
import { SCOUT_REPORTER_ENABLED } from '@kbn/scout-info';

interface JestConfigResult {
  config: string;
  code: number;
  durationMs: number;
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

  const configs = configsArg
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  if (!configs.length) {
    log.error('No configs found after parsing --configs');
    process.exit(1);
  }

  log.info(
    `Launching up to ${maxParallel} parallel Jest config processes (forcing --runInBand per process).`
  );
  // legacy --parallelism flag removed

  const results: JestConfigResult[] = [];
  let globalExit = 0;

  let active = 0;
  let index = 0;

  await new Promise<void>((resolveAll) => {
    const launchNext = () => {
      while (active < maxParallel && index < configs.length) {
        const config = configs[index++];
        const start = Date.now();
        active += 1;

        // Prepare args (always run tests in-band inside each process to avoid nested worker contention)
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
          if (code !== 0) {
            globalExit = 10; // Align with previous shell script behaviour
          }

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

  const totalMs = Date.now() - startAll;
  reporter(startAll, 'total', {
    success: globalExit === 0,
    testFiles: results.map((r) => relative(process.cwd(), r.config)),
  });

  log.info('--- Combined Jest run summary');
  for (const r of results) {
    const sec = Math.round(r.durationMs / 1000);
    log.info(`  - ${r.config} : exit ${r.code} (${sec}s)`);
  }
  log.info(`Total duration: ${Math.round(totalMs / 1000)}s`);

  process.exit(globalExit);
}
