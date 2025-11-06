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
import Table from 'cli-table3';
import chalk from 'chalk';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { tmpdir } from 'os';
import { getJestConfigs } from './configs/get_jest_configs';

interface JestConfigResult {
  config: string;
  code: number;
  durationMs: number;
  slowTestsFile?: string;
  failedTests?: FailedTest[];
}

interface SlowTest {
  duration: number;
  fullName: string;
  filePath: string;
}

interface FailedTest {
  fullName: string;
  filePath: string;
  failureMessage: string;
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

    const { configsWithTests, emptyConfigs } = await getJestConfigs(passedConfigs);

    writeConfigDiscoverySummary(passedConfigs, configsWithTests, emptyConfigs, log);

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

  log.write('--- Combined Jest run summary');

  await writeSummary(results, log, totalMs);

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

  const slowTestsDir = `${tmpdir()}/kibana-jest-slow-tests`;
  await fs.mkdir(slowTestsDir, { recursive: true });

  await new Promise<void>((resolveAll) => {
    const launchNext = () => {
      while (active < maxParallel && index < configs.length) {
        const config = configs[index++];
        const start = Date.now();
        active += 1;

        // Create unique output file for this config's slow tests
        const configHash = config.replace(/[^a-zA-Z0-9]/g, '_');
        const slowTestsFile = `${slowTestsDir}/slow-tests-${configHash}-${Date.now()}.json`;

        const args = [
          'scripts/jest',
          '--config',
          relative(REPO_ROOT, config),
          '--runInBand',
          '--coverage=false',
          '--passWithNoTests',
        ];

        const proc = spawn(process.execPath, args, {
          env: {
            ...process.env,
            SLOW_TESTS_OUTPUT_PATH: slowTestsFile,
          },
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
        });

        proc.on('exit', (c) => {
          const code = c == null ? 1 : c;
          const durationMs = Date.now() - start;

          // Parse failed tests from output if the run failed
          const failedTests = code !== 0 ? parseFailedTests(buffer) : [];

          results.push({ config, code, durationMs, slowTestsFile, failedTests });

          // Print buffered output after completion to keep logs grouped per config
          const sec = Math.round(durationMs / 1000);

          log.info(
            `Output for ${config} (exit ${code} - ${
              code === 0 ? 'success' : 'failure'
            }, ${sec}s)\n` +
              buffer +
              '\n'
          );

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

function parseFailedTests(output: string): FailedTest[] {
  const failedTests: FailedTest[] = [];
  const lines = output.split('\n');

  // Look for patterns like:
  // ● Test Suite Name › Test Name
  // or
  // FAIL path/to/test.ts

  let currentFile = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect test file from FAIL lines (may have timing info like "(10.51 s)" at end)
    const failMatch = line.match(/^\s*FAIL\s+(.+\.(?:test|spec)\.[tj]sx?)/);
    if (failMatch) {
      currentFile = failMatch[1].trim();
      continue;
    }

    // Detect failed test names (lines starting with ●)
    const testMatch = line.match(/^\s*●\s+(.+)$/);
    if (testMatch && currentFile) {
      const fullName = testMatch[1].trim();

      // Extract error message (next few lines until we hit another ● or blank line)
      let failureMessage = '';
      let j = i + 1;
      while (j < lines.length && !lines[j].match(/^\s*●/) && j < i + 10) {
        if (lines[j].trim()) {
          failureMessage += lines[j] + '\n';
        }
        j++;
      }

      failedTests.push({
        fullName,
        filePath: currentFile,
        failureMessage: failureMessage.trim().substring(0, 200), // Limit message length
      });
    }
  }

  return failedTests;
}

async function writeSummary(results: JestConfigResult[], log: ToolingLog, totalMs: number) {
  const cwd = process.cwd();

  const table = new Table({
    head: ['Config', 'Status', 'Slow Tests', 'Duration'],
    colAligns: ['left', 'center', 'right', 'right'],
    style: {
      head: ['cyan', 'bold'],
      border: ['gray'],
    },
  });

  // Read slow tests for each config
  for (const r of results) {
    const relativePath = relative(cwd, r.config);
    const sec = Math.round(r.durationMs / 1000);
    const statusIcon = r.code === 0 ? '✅' : '❌';

    let slowTestCount = '0';
    let topSlowTests: SlowTest[] = [];
    let slowTests: SlowTest[] = [];

    if (r.slowTestsFile) {
      try {
        const fileExists = await fs
          .stat(r.slowTestsFile)
          .then(() => true)
          .catch(() => false);

        if (fileExists) {
          const content = await fs.readFile(r.slowTestsFile, 'utf8');
          slowTests = JSON.parse(content);
          if (slowTests.length > 0) {
            slowTestCount = slowTests.length.toString();
            // Get top 5 slowest tests for this config
            topSlowTests = slowTests.sort((a, b) => b.duration - a.duration).slice(0, 5);
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Add main config row
    // i.e.: | src/plugins/core/core.test.ts | ✅ | 3 | 30s |
    table.push([chalk.bold(relativePath), statusIcon, slowTestCount, `${sec}s`]);

    // Add failed tests if any
    if (r.failedTests && r.failedTests.length > 0) {
      table.push([{ colSpan: 4, content: `${chalk.bold.red('  Failed tests:')}` }]);

      // Group failed tests by file path
      const failedTestsByFile = new Map<string, FailedTest[]>();
      for (const test of r.failedTests) {
        const testRelativePath = relative(cwd, test.filePath);
        if (!failedTestsByFile.has(testRelativePath)) {
          failedTestsByFile.set(testRelativePath, []);
        }
        failedTestsByFile.get(testRelativePath)!.push(test);
      }

      // Display grouped failed tests
      for (const [filePath, tests] of failedTestsByFile) {
        table.push([`  ${filePath}`]);

        for (const test of tests) {
          table.push([`    ${test.fullName}`, '❌', '', '']);
        }
      }
    }

    // Add top 5 slow tests as indented rows
    // i.e.: | src/plugins/core/core.test.ts | ⚠️ | 0.1s |
    if (topSlowTests.length > 0) {
      // Add header row for slow tests
      table.push([
        {
          colSpan: 4,
          content: `${chalk.bold.yellow(
            `${topSlowTests.length > 4 ? 'Top' : ''} Slow tests (> 300ms): (Showing ${
              topSlowTests.length
            } of ${slowTests.length})`
          )}`,
        },
      ]);

      // Group tests by file path
      const testsByFile = new Map<string, SlowTest[]>();
      for (const test of topSlowTests) {
        const testRelativePath = relative(cwd, test.filePath);

        if (!testsByFile.has(testRelativePath)) {
          testsByFile.set(testRelativePath, []);
        }

        testsByFile.get(testRelativePath)!.push(test);
      }

      // Display grouped tests
      for (const [filePath, tests] of testsByFile) {
        table.push([`  ${filePath}`]);

        for (const test of tests) {
          const durationFormatted =
            test.duration >= 1000 ? `${(test.duration / 1000).toFixed(1)}s` : `${test.duration}ms`;

          table.push([`    ${test.fullName}`, '⚠️', '', durationFormatted]);
        }
      }
    }
  }

  log.info(table.toString());

  log.info(`Total duration (wall to wall): ${Math.round(totalMs / 1000)}s`);
}

function writeConfigDiscoverySummary(
  passedConfigs: string[],
  configsWithTests: Array<{ config: string; testFiles: string[] }>,
  emptyConfigs: string[],
  log: ToolingLog
) {
  log.info('Config Discovery Summary:');

  const table = new Table({
    head: ['Category', 'Count'],
    colAligns: ['left', 'right'],
    style: {
      head: ['cyan', 'bold'],
      border: ['gray'],
    },
  });

  table.push(
    ['Configs passed', passedConfigs.length],
    ['Configs with test files', configsWithTests.length],
    ['Configs with no tests (skipping)', emptyConfigs.length],
    [`${chalk.bold('Configs to run ')}`, configsWithTests.length]
  );

  log.info(table.toString());
  log.info('');
  log.info(`Run with --debug to see which configs are empty`);

  log.debug(
    'Empty configs:',
    emptyConfigs.map((c) => c)
  );
}
