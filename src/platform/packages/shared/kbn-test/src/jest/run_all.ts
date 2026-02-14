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
import { relative } from 'path';
import { spawn } from 'child_process';
import Table from 'cli-table3';
import chalk from 'chalk';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { tmpdir } from 'os';
import { getJestConfigs } from './configs/get_jest_configs';
import { isInBuildkite, markConfigCompleted, isConfigCompleted } from './buildkite_checkpoint';
import { parseShardAnnotation, annotateConfigWithShard } from './shard_config';

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

  let hasAnyConfigs = false;

  if (configsArg) {
    const passedConfigs = configsArg
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    // CI path: configs may have shard annotations (e.g., config.js||shard=1/2).
    // Strip annotations before passing to getJestConfigs, then re-annotate.
    const shardAnnotations = new Map<string, string[]>(); // cleanRelPath -> ['1/2', '2/2']
    const cleanPassedConfigs: string[] = [];

    for (const entry of passedConfigs) {
      const { config: cleanConfig, shard } = parseShardAnnotation(entry);
      if (!cleanPassedConfigs.includes(cleanConfig)) {
        cleanPassedConfigs.push(cleanConfig);
      }
      if (shard) {
        const shards = shardAnnotations.get(cleanConfig) || [];
        shards.push(shard);
        shardAnnotations.set(cleanConfig, shards);
      }
    }

    const { configsWithTests, emptyConfigs } = await getJestConfigs(cleanPassedConfigs);

    writeConfigDiscoverySummary(cleanPassedConfigs, configsWithTests, emptyConfigs, log);

    hasAnyConfigs = Boolean(configsWithTests.length || emptyConfigs.length);

    // Re-expand configs with their shard annotations from CI.
    // On CI, annotations are pre-embedded by pick_test_group_run_order.ts.
    // Locally (no annotations), configs run without sharding.
    for (const { config: absPath } of configsWithTests) {
      const relPath = relative(REPO_ROOT, absPath);
      const shards = shardAnnotations.get(relPath);
      if (shards && shards.length > 0) {
        // CI path: use the explicit annotations provided upstream
        for (const shard of shards) {
          configs.push(annotateConfigWithShard(absPath, shard));
        }
      } else {
        configs.push(absPath);
      }
    }
  } else {
    log.info('--configs flag is not passed. Finding and running all configs in the repo.');

    const { configsWithTests, emptyConfigs } = await getJestConfigs();

    const rawConfigs = configsWithTests.map((c) => c.config);

    hasAnyConfigs = Boolean(rawConfigs.length);

    log.info(
      `Found ${rawConfigs.length} configs to run. Found ${emptyConfigs.length} configs with no tests. Skipping them.`
    );

    // Locally, run all discovered configs without auto-sharding.
    // Sharding is only applied on CI via pick_test_group_run_order.ts annotations.
    configs = rawConfigs;
  }

  log.info(
    `Launching up to ${maxParallel} parallel Jest config processes (forcing --runInBand per process).`
  );

  if (!hasAnyConfigs) {
    log.error('No configs found after parsing --configs');
    process.exit(1);
  }

  // First pass
  const firstPass = configs.length ? await runConfigs(configs, maxParallel, log) : [];

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

  log.write('--- Combined Jest run summary');

  await writeSummary(results, log, totalMs);

  process.exit(globalExit);
}

async function runConfigs(
  allConfigs: string[],
  maxParallel: number,
  log: ToolingLog
): Promise<JestConfigResult[]> {
  const skippedResults: JestConfigResult[] = [];
  let configs = allConfigs;

  // In Buildkite, skip configs already completed on a previous attempt (checkpoint resume)
  if (isInBuildkite()) {
    log.info(
      `[jest-checkpoint] Checking ${allConfigs.length} configs for prior completion (step=${
        process.env.BUILDKITE_STEP_ID || ''
      }, job=${process.env.BUILDKITE_PARALLEL_JOB || '0'}, retry=${
        process.env.BUILDKITE_RETRY_COUNT || '0'
      })`
    );

    const completionStatus = await Promise.all(
      allConfigs.map(async (config) => {
        // Use relative path for checkpoint key so it's stable across different CI agents
        const relConfig = relative(REPO_ROOT, config);
        const completed = await isConfigCompleted(relConfig);
        log.info(`[jest-checkpoint]   ${completed ? 'SKIP' : 'RUN '} ${relConfig}`);
        return { config, completed };
      })
    );

    const skipped = completionStatus.filter((c) => c.completed);
    configs = completionStatus.filter((c) => !c.completed).map((c) => c.config);

    for (const { config } of skipped) {
      skippedResults.push({ config, code: 0, durationMs: 0 });
    }

    if (skipped.length > 0) {
      log.info(
        `[jest-checkpoint] Resumed: skipped ${skipped.length} already-completed, ${configs.length} remaining`
      );
    } else {
      log.info(
        `[jest-checkpoint] No prior checkpoints found, running all ${configs.length} configs`
      );
    }
  }

  if (configs.length === 0) {
    return skippedResults;
  }

  const results: JestConfigResult[] = [];
  let active = 0;
  let index = 0;

  const slowTestsDir = `${tmpdir()}/kibana-jest-slow-tests`;
  await fs.mkdir(slowTestsDir, { recursive: true });

  await new Promise<void>((resolveAll) => {
    const wallStart = Date.now();

    // Periodic heartbeat so CI logs show progress even when no config has finished yet
    const heartbeat = setInterval(() => {
      const elapsedSec = Math.round((Date.now() - wallStart) / 1000);
      const min = Math.floor(elapsedSec / 60);
      const sec = elapsedSec % 60;
      const queued = configs.length - index;
      log.info(
        `[jest-progress] ${active} running, ${results.length} completed, ${queued} queued (elapsed ${min}m ${sec}s)`
      );
    }, 60_000);
    heartbeat.unref(); // don't keep the process alive just for the timer

    const launchNext = () => {
      while (active < maxParallel && index < configs.length) {
        const config = configs[index++];
        const start = Date.now();
        active += 1;

        // Parse shard annotation if present (e.g., "/abs/path/config.js||shard=1/2")
        const { config: cleanConfig, shard } = parseShardAnnotation(config);

        // Create unique output file for this config's slow tests
        const configHash = cleanConfig.replace(/[^a-zA-Z0-9]/g, '_');
        const shardSuffix = shard ? `_shard_${shard.replace('/', '_')}` : '';
        const slowTestsFile = `${slowTestsDir}/slow-tests-${configHash}${shardSuffix}-${Date.now()}.json`;

        const args = [
          'scripts/jest',
          '--config',
          relative(REPO_ROOT, cleanConfig),
          '--runInBand',
          '--coverage=false',
          '--passWithNoTests',
          ...(shard ? [`--shard=${shard}`] : []),
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

          const relConfigPath = relative(REPO_ROOT, config);
          log.info(
            `Output for ${relConfigPath} (exit ${code} - ${
              code === 0 ? 'success' : 'failure'
            }, ${sec}s)\n` +
              buffer +
              '\n'
          );

          const proceed = () => {
            // Log how many configs are left to complete (after checkpoint is written)
            const remaining = configs.length - results.length;
            log.info(`Configs left: ${remaining}`);

            active -= 1;
            if (index < configs.length) {
              launchNext();
            } else if (active === 0) {
              clearInterval(heartbeat);
              resolveAll();
            }
          };

          // Write checkpoint for successful configs before proceeding
          // Use relative path for stable keys across CI agents
          if (code === 0 && isInBuildkite()) {
            log.info(`[jest-checkpoint] Marking ${relConfigPath} as completed`);
            markConfigCompleted(relConfigPath).then(proceed, proceed);
          } else {
            proceed();
          }
        });
      }
    };
    launchNext();
  });

  return [...skippedResults, ...results];
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
