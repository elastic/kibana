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
 * Negative testing for `scripts/jest_all`: each scenario feeds a deliberately-failing
 * Jest config to the runner and inverts the result — it passes only if the runner
 * surfaces the expected failure. Scenarios tagged with a tracking issue pin a known
 * runner bug and go red once it's fixed (the signal to update them).
 */

const NEGATIVE_FAILURE_EXIT_CODE = 10; // scripts/jest_all's "a config failed" code
const DEFAULT_SCENARIO_TIMEOUT_MS = 10 * 60 * 1000;

export interface NegativeScenario {
  name: string;
  description: string;
  /** REPO_ROOT-relative path to the canary Jest config. */
  configPath: string;
  /** Exit code the runner must produce; `'timeout'` means we expect it to hang and kill it. */
  expectedExitCode: number | 'timeout';
  /** All must appear in the runner output for the scenario to pass. */
  expectedPatterns: RegExp[];
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
    env: { NODE_OPTIONS: '--max-old-space-size=256' },
    expectedPatterns: [/worker_oom/, /heap out of memory|out of memory|FATAL ERROR/i],
  },
  {
    name: 'log_buffer_overload',
    description: 'output larger than a JS string (~512MB)',
    configPath: fixtureConfig('log_buffer_overload'),
    // KNOWN BUG elastic/kibana-operations#624: runner buffers child output into a JS
    // string and crashes with an uncaught "Invalid string length" (exit 1).
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
  // Skipping, as it's flaky.
  // {
  //   name: 'process_exit_zero',
  //   description: 'test calls process.exit(0), runner falsely reports PASS',
  //   configPath: fixtureConfig('process_exit_zero'),
  //   // KNOWN BUG elastic/kibana-operations#625: runner trusts the child exit code, so a
  //   // mid-run process.exit(0) is reported green even though a failing test never ran.
  //   expectedExitCode: 0,
  //   expectedPatterns: [/process\.exit called with "0"/, /✅.*process_exit_zero/],
  // },
  {
    name: 'runner_hang',
    description: 'test leaves an open handle, runner hangs forever',
    configPath: fixtureConfig('runner_hang'),
    // KNOWN BUG elastic/kibana-operations#626: no per-config timeout, so a child that
    // never exits hangs the runner until this scenario's timeoutMs kills it.
    expectedExitCode: 'timeout',
    expectedPatterns: [/Starting .*runner_hang/],
    timeoutMs: 90_000,
  },
];

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

const runScenario = async (
  scenario: NegativeScenario,
  log: ToolingLog
): Promise<ScenarioOutcome> => {
  log.write(`--- Negative canary: ${scenario.name} (${scenario.description})`);

  // Strip BUILDKITE so jest_all's checkpoint/resume can't skip a canary on a step
  // retry: process_exit_zero exits 0 by design, gets marked "done", and would then be
  // skipped on the next attempt — dropping the output this canary asserts on.
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    JEST_WARMUP_DELAY_MS: '0',
    ...scenario.env,
  };
  delete childEnv.BUILDKITE;

  const started = Date.now();
  const subprocess = execa('node', ['scripts/jest_all', '--configs', scenario.configPath], {
    cwd: REPO_ROOT,
    reject: false,
    all: true,
    detached: true, // detached=true: own process group so a timeout can SIGKILL the whole tree
    env: childEnv,
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
