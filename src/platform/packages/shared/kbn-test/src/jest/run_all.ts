/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';
import { promises as fs } from 'fs';
import { relative, dirname } from 'path';
import { spawn } from 'child_process';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { getJestConfigs } from './configs/get_jest_configs';

interface JestConfigResult {
  config: string;
  code: number;
  durationMs: number;
}

// Run multiple Jest configs in parallel using separate Jest processes (one per config).
// We explicitly disable Jest's own worker pool for each process using --runInBand.
//
// Flags:
//   --configs       Comma-separated list of jest config file paths (optional, if not passed, all configs in the repo will be run)
//   --maxParallel   Maximum concurrent Jest config processes (optional, defaults to env JEST_MAX_PARALLEL or 3)
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

  let configs: string[] = [];

  if (configsArg) {
    const passedConfigs = configsArg
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const { configsWithTests } = await getJestConfigs(passedConfigs);

    configs = configsWithTests.map((c) => c.config);
  } else {
    log.info('--configs flag is not passed. Finding and running all configs in the repo.');

    const { configsWithTests, emptyConfigs } = await getJestConfigs();

    configs = configsWithTests.map((c) => c.config);

    log.info(
      `Found ${configs.length} configs to run. Found ${emptyConfigs.length} configs with no tests. Skipping them.`
    );
  }

  if (!configs.length) {
    log.error('No configs found after parsing --configs');
    process.exit(1);
  }

  log.info(
    `Launching up to ${maxParallel} parallel Jest config processes (forcing --runInBand per process).`
  );

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

      for (const f of fixed) {
        log.info(`  - ${f}`);
      }
    }

    if (stillFailing.length) {
      log.info('Configs still failing after retry:');
      for (const f of stillFailing) {
        log.info(`  - ${f}`);
      }
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
          '--runInBand',
          '--coverage=false',
          '--passWithNoTests',
        ];

        const proc = spawn(process.execPath, args, {
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let buffer = '';

        proc.stdout.on('data', (d) => {
          const output = d.toString();
          buffer += output;
        });

        proc.stderr.on('data', (d) => {
          const output = d.toString();
          buffer += output;
          process.stderr.write(d);
        });

        proc.on('exit', (c) => {
          const code = c == null ? 1 : c;
          const durationMs = Date.now() - start;
          results.push({ config, code, durationMs });

          // Print buffered output after completion to keep logs grouped per config
          const sec = Math.round(durationMs / 1000);

          log.info(`Output for ${config} (exit ${code}, ${sec}s)\n` + buffer + '\n');

          // Log how many configs are left to complete
          const remaining = configs.length - results.length;
          log.info(`Configs left: ${remaining}`);

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
