/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateScenario, NEGATIVE_SCENARIOS, type NegativeScenario } from './run_negative';

const scenario: NegativeScenario = {
  name: 'example',
  description: 'example canary',
  configPath: 'path/to/jest.config.js',
  expectedExitCode: 10,
  expectedPatterns: [/example/, /FAILED/],
};

describe('evaluateScenario', () => {
  it('passes when the runner fails with the expected exit code and all patterns match', () => {
    const result = evaluateScenario(scenario, 10, 'example config FAILED');

    expect(result.passedAsExpected).toBe(true);
    expect(result.exitCodeMatched).toBe(true);
    expect(result.missingPatterns).toHaveLength(0);
  });

  it('fails when the runner unexpectedly succeeds (exit 0)', () => {
    const result = evaluateScenario(scenario, 0, 'example config FAILED');

    expect(result.passedAsExpected).toBe(false);
    expect(result.exitCodeMatched).toBe(false);
  });

  it('fails when the exit code is non-zero but not the expected one', () => {
    const result = evaluateScenario(scenario, 1, 'example config FAILED');

    expect(result.passedAsExpected).toBe(false);
    expect(result.exitCodeMatched).toBe(false);
  });

  it('fails when the failure signature is missing (failed for the wrong reason)', () => {
    const result = evaluateScenario(scenario, 10, 'some unrelated output');

    expect(result.passedAsExpected).toBe(false);
    expect(result.exitCodeMatched).toBe(true);
    expect(result.missingPatterns).toEqual([/example/, /FAILED/]);
  });

  it('matches a runner crash by its exact exit code (1)', () => {
    const crashScenario: NegativeScenario = {
      ...scenario,
      expectedExitCode: 1,
      expectedPatterns: [/boom/],
    };

    expect(evaluateScenario(crashScenario, 1, 'boom').passedAsExpected).toBe(true);
    expect(evaluateScenario(crashScenario, 10, 'boom').passedAsExpected).toBe(false);
    expect(evaluateScenario(crashScenario, 0, 'boom').passedAsExpected).toBe(false);
  });

  it("matches a runner hang only when the scenario expects 'timeout'", () => {
    const hangScenario: NegativeScenario = {
      ...scenario,
      expectedExitCode: 'timeout',
      expectedPatterns: [/Starting/],
    };

    expect(evaluateScenario(hangScenario, 'timeout', 'Starting cfg').passedAsExpected).toBe(true);
    expect(evaluateScenario(hangScenario, 10, 'Starting cfg').passedAsExpected).toBe(false);
    expect(evaluateScenario(scenario, 'timeout', 'example FAILED').passedAsExpected).toBe(false);
  });

  it('matches a known-bug false pass by exit 0 plus its signature', () => {
    const falsePassScenario: NegativeScenario = {
      ...scenario,
      expectedExitCode: 0,
      expectedPatterns: [/process\.exit called with "0"/],
    };

    const goodRun = evaluateScenario(falsePassScenario, 0, 'process.exit called with "0"');
    expect(goodRun.passedAsExpected).toBe(true);

    // Once the runner catches the abuse (exits 10), the pinned bug is fixed → canary flips
    const fixedRunner = evaluateScenario(falsePassScenario, 10, 'process.exit called with "0"');
    expect(fixedRunner.passedAsExpected).toBe(false);
  });
});

describe('NEGATIVE_SCENARIOS', () => {
  it('covers the documented failure modes', () => {
    expect(NEGATIVE_SCENARIOS.map((s) => s.name)).toEqual([
      'assertion_failure',
      'worker_oom',
      'log_buffer_overload',
      'test_timeout',
      'suite_import_error',
      'nonzero_no_failures',
      // 'process_exit_zero',
      'runner_hang',
    ]);
  });

  it('gives every canary an output signature and a fixture config', () => {
    for (const s of NEGATIVE_SCENARIOS) {
      expect(s.expectedPatterns.length).toBeGreaterThan(0);
      expect(s.configPath).toContain('__fixtures__');
    }
  });

  it('only known-bug canaries may expect a pass or a hang', () => {
    // process_exit_zero pins elastic/kibana-operations#625 (false PASS);
    // runner_hang pins elastic/kibana-operations#626 (no per-config timeout).
    const knownBugCanaries = ['process_exit_zero', 'runner_hang'];
    for (const s of NEGATIVE_SCENARIOS) {
      if (!knownBugCanaries.includes(s.name)) {
        expect(typeof s.expectedExitCode).toBe('number');
        expect(s.expectedExitCode).toBeGreaterThan(0);
      }
    }
  });
});
