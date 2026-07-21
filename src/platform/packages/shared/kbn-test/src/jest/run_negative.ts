/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import execa from 'execa';
import Table from 'cli-table3';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Negative testing for the Jest runner (`scripts/jest_all`).
 *
 * Each scenario is a "canary": a Jest config wired to fail in a specific way. We feed
 * each one to the real runner, capture its exit code + output, and INVERT the result —
 * a scenario only passes if the runner reported the expected failure. If a change to the
 * runner ever stops surfacing one of these failures, this job goes red.
 *
 * A few canaries pin KNOWN BUGS in the runner instead (marked below with a tracking
 * issue): they assert today's broken behavior, so fixing the bug flips them red —
 * the signal to update or remove that canary.
 */

const NEGATIVE_FAILURE_EXIT_CODE = 10; // scripts/jest_all exits 10 when any config fails
const DEFAULT_SCENARIO_TIMEOUT_MS = 10 * 60 * 1000;

export interface NegativeScenario {
  name: string;
  description: string;
  /** REPO_ROOT-relative path to the canary Jest config. */
  configPath: string;
  /**
   * Exit code the runner must produce. `10` is `scripts/jest_all`'s graceful
   * "a config failed" code; a crash in the runner itself (e.g. the string-buffer
   * overflow) surfaces as an uncaught exception, i.e. exit `1`. `'timeout'` means
   * the runner is expected to hang and be killed by this scenario's `timeoutMs`
   * (there is no exit code in that case).
   */
  expectedExitCode: number | 'timeout';
  /** All of these must appear in the runner output for the scenario to pass. */
  expectedPatterns: RegExp[];
  /** Extra env for this scenario's runner invocation (e.g. a small heap for OOM). */
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface ScenarioEvaluation {
  exitCodeMatched: boolean;
  missingPatterns: RegExp[];
  passedAsExpected: boolean;
}

export interface ScenarioOutcome extends ScenarioEvaluation {
  scenario: NegativeScenario;
  exitCode: number | 'timeout';
  durationMs: number;
}

const fixtureConfig = (scenario: string) =>
  Path.join(
    'src/platform/packages/shared/kbn-test/src/jest/negative/__fixtures__',
    scenario,
    'jest.config.js'
  );

export const NEGATIVE_SCENARIOS: NegativeScenario[] = [
  {
    name: 'assertion_failure',
    description: 'a plain failing assertion',
    configPath: fixtureConfig('assertion_failure'),
    expectedExitCode: NEGATIVE_FAILURE_EXIT_CODE,
    expectedPatterns: [/assertion_failure/, /Expected/, /Received/],
  },
  {
    name: 'worker_oom',
    description: 'test process is OOM-killed',
    configPath: fixtureConfig('worker_oom'),
    expectedExitCode: NEGATIVE_FAILURE_EXIT_CODE,
    // A small heap makes the allocation loop crash quickly and deterministically.
    env: { NODE_OPTIONS: '--max-old-space-size=256' },
    expectedPatterns: [/worker_oom/, /heap out of memory|out of memory|FATAL ERROR/i],
  },
  {
    name: 'log_buffer_overload',
    description: 'output larger than a JS string (~512MB)',
    configPath: fixtureConfig('log_buffer_overload'),
    // The current runner accumulates child output into a JS string and crashes with an
    // uncaught "Invalid string length", i.e. exit 1 (not the graceful 10). Tracked in
    // elastic/kibana-operations#624 (bug fix elastic/kibana#269289 was merged then
    // reverted). When the buffer is fixed the runner will no longer crash and this
    // canary will start failing the pipeline; remove or update it then.
    expectedExitCode: 1,
    expectedPatterns: [/Invalid string length/],
  },
  {
    name: 'test_timeout',
    description: 'a test that never resolves within its timeout',
    configPath: fixtureConfig('test_timeout'),
    expectedExitCode: NEGATIVE_FAILURE_EXIT_CODE,
    expectedPatterns: [/test_timeout/, /Exceeded timeout|timeout/i],
  },
  {
    name: 'suite_import_error',
    description: 'suite fails to load (unresolvable import)',
    configPath: fixtureConfig('suite_import_error'),
    expectedExitCode: NEGATIVE_FAILURE_EXIT_CODE,
    expectedPatterns: [/suite_import_error/, /Cannot find module|find module/i],
  },
  {
    name: 'nonzero_no_failures',
    description: 'process exits non-zero with no parseable failures',
    configPath: fixtureConfig('nonzero_no_failures'),
    expectedExitCode: NEGATIVE_FAILURE_EXIT_CODE,
    expectedPatterns: [/nonzero_no_failures/, /no individual test failures parsed/],
  },
  {
    name: 'process_exit_zero',
    description: 'test calls process.exit(0), runner falsely reports PASS',
    configPath: fixtureConfig('process_exit_zero'),
    // KNOWN BUG: the runner trusts the child exit code alone, so a mid-run
    // process.exit(0) yields a green config even though a failing test never ran.
    // This canary pins the buggy behavior; tracked in elastic/kibana-operations#625.
    // When the runner verifies run completeness, flip this to exit 10 + FAILED.
    expectedExitCode: 0,
    expectedPatterns: [/process\.exit called with "0"/, /✅.*process_exit_zero/],
  },
  {
    name: 'runner_hang',
    description: 'test leaves an open handle, runner hangs forever',
    configPath: fixtureConfig('runner_hang'),
    // KNOWN BUG: run_all has no per-config timeout, so a child that never exits
    // hangs the runner until something external kills it — here, this scenario's
    // timeoutMs. Tracked in elastic/kibana-operations#626. When the runner enforces
    // its own per-config timeout, flip this to exit 10 + a timeout report.
    expectedExitCode: 'timeout',
    expectedPatterns: [/Starting .*runner_hang/],
    timeoutMs: 90_000,
  },
];

/** Pure inversion logic: did the runner behave the way this scenario expects? */
export const evaluateScenario = (
  scenario: NegativeScenario,
  exitCode: number | 'timeout',
  output: string
): ScenarioEvaluation => {
  const exitCodeMatched = exitCode === scenario.expectedExitCode;
  const missingPatterns = scenario.expectedPatterns.filter((pattern) => !pattern.test(output));

  return {
    exitCodeMatched,
    missingPatterns,
    passedAsExpected: exitCodeMatched && missingPatterns.length === 0,
  };
};

/** Entry point for `scripts/jest_negative`. */
export const runJestNegative = async () => {
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

  log.info(
    `Negative testing ${NEGATIVE_SCENARIOS.length} canaries against scripts/jest_all; ` +
      `each must produce its expected failure mode.`
  );

  const outcomes: ScenarioOutcome[] = [];
  for (const scenario of NEGATIVE_SCENARIOS) {
    outcomes.push(await runScenario(scenario, log));
  }

  writeSummary(outcomes, log);

  const unexpected = outcomes.filter((outcome) => !outcome.passedAsExpected);
  if (unexpected.length > 0) {
    log.error(
      `${unexpected.length} canary/canaries did not behave as expected: ${unexpected
        .map((outcome) => outcome.scenario.name)
        .join(', ')}. Either the Jest runner stopped surfacing a failure, or a known bug ` +
        `pinned by a canary was fixed (see the scenario's tracking issue).`
    );
    process.exit(1);
  }

  log.success(`All ${outcomes.length} canaries behaved as expected.`);
  process.exit(0);
};

const runScenario = async (
  scenario: NegativeScenario,
  log: ToolingLog
): Promise<ScenarioOutcome> => {
  log.write(`--- Negative canary: ${scenario.name} (${scenario.description})`);

  const started = Date.now();
  // detached puts the runner in its own process group so a timeout can kill the
  // whole tree — execa's own `timeout` only signals the direct child, leaking the
  // hung Jest grandchild (the very thing the runner_hang canary creates).
  const subprocess = execa('node', ['scripts/jest_all', '--configs', scenario.configPath], {
    cwd: REPO_ROOT,
    reject: false,
    all: true,
    detached: true,
    env: {
      ...process.env,
      // Single config, but be explicit so the runner never waits on cache warmup.
      JEST_WARMUP_DELAY_MS: '0',
      ...scenario.env,
    },
  });

  let timedOut = false;
  const killTimer = setTimeout(() => {
    timedOut = true;
    try {
      process.kill(-subprocess.pid!, 'SIGKILL');
    } catch {
      // process group already gone
    }
  }, scenario.timeoutMs ?? DEFAULT_SCENARIO_TIMEOUT_MS);

  const result = await subprocess;
  clearTimeout(killTimer);

  const durationMs = Date.now() - started;
  const exitCode = timedOut ? 'timeout' : result.exitCode ?? 1;
  const output = result.all ?? `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

  const evaluation = evaluateScenario(scenario, exitCode, output);

  if (evaluation.passedAsExpected) {
    log.success(`${scenario.name}: behaved as expected (exit ${exitCode})`);
  } else {
    log.error(`${scenario.name}: did NOT behave as expected (exit ${exitCode})`);
    if (!evaluation.exitCodeMatched) {
      log.error(`  expected exit ${scenario.expectedExitCode}, got ${exitCode}`);
    }
    for (const pattern of evaluation.missingPatterns) {
      log.error(`  missing expected output pattern: ${pattern}`);
    }
    // Surface the runner output so failures are debuggable in CI.
    log.write(output);
  }

  return { scenario, exitCode, durationMs, ...evaluation };
};

const writeSummary = (outcomes: ScenarioOutcome[], log: ToolingLog) => {
  const table = new Table({
    head: ['Canary', 'Expected', 'Exit', 'Result', 'Duration'],
    colAligns: ['left', 'left', 'right', 'center', 'right'],
    style: { head: ['cyan', 'bold'], border: ['gray'] },
  });

  for (const outcome of outcomes) {
    table.push([
      outcome.scenario.name,
      outcome.scenario.description,
      String(outcome.exitCode),
      outcome.passedAsExpected ? 'PASS' : 'FAIL',
      `${Math.round(outcome.durationMs / 1000)}s`,
    ]);
  }

  log.write('+++ Negative testing summary');
  log.info(table.toString());
};
