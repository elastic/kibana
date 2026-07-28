/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Os from 'os';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

import {
  parseMoonJestOutput,
  computeJestParallelism,
  buildMoonJestWarnings,
  buildJestNodeOptions,
  JEST_WORKER_MAX_OLD_SPACE_MB,
} from './run_jest_via_moon';

describe('buildJestNodeOptions', () => {
  it('sets the default heap cap when NODE_OPTIONS is unset', () => {
    expect(buildJestNodeOptions(undefined)).toBe(
      `--max-old-space-size=${JEST_WORKER_MAX_OLD_SPACE_MB}`
    );
  });

  it('lets a user-supplied --max-old-space-size win over the default (last flag wins)', () => {
    // This is the exact remediation run_check.ts prints on OOM: it must actually take effect.
    const result = buildJestNodeOptions('--max-old-space-size=8192');
    const values = [...result.matchAll(/--max-old-space-size=(\d+)/g)].map((m) => m[1]);
    expect(values[values.length - 1]).toBe('8192');
  });

  it('preserves other user-supplied NODE_OPTIONS flags', () => {
    expect(buildJestNodeOptions('--trace-warnings')).toBe(
      `--max-old-space-size=${JEST_WORKER_MAX_OLD_SPACE_MB} --trace-warnings`
    );
  });
});

describe('parseMoonJestOutput', () => {
  it('parses successful Jest JSON output with project prefix', () => {
    const output = [
      'pass RunTask(@kbn/foo:jest) (1s 200ms, abc123)',
      '@kbn/foo:jest | {"success":true,"numTotalTests":5,"numPassedTests":5,"numFailedTests":0,"testResults":[]}',
    ].join('\n');

    const result = parseMoonJestOutput(output);
    expect(result.parseFailures).toEqual([]);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      project: '@kbn/foo',
      passed: true,
      testCount: 5,
      failures: [],
    });
  });

  it('marks cached tasks', () => {
    const output = [
      'pass RunTask(@kbn/foo:jest) (cached, 100ms, abc123)',
      '@kbn/foo:jest | {"success":true,"numTotalTests":3,"numPassedTests":3,"numFailedTests":0,"testResults":[]}',
    ].join('\n');

    const result = parseMoonJestOutput(output);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].cached).toBe(true);
    expect(result.tasks[0].passed).toBe(true);
  });

  it('creates placeholder for cached tasks without JSON output', () => {
    const output = 'pass RunTask(@kbn/bar:jest) (cached, 50ms, def456)';

    const result = parseMoonJestOutput(output);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      project: '@kbn/bar',
      cached: true,
      passed: true,
      testCount: 0,
      failures: [],
    });
  });

  it('extracts failure details from Jest JSON', () => {
    const output = [
      'fail RunTask(@kbn/foo:jest) (2s, abc123)',
      '@kbn/foo:jest | {"success":false,"numTotalTests":2,"numPassedTests":1,"numFailedTests":1,"testResults":[{"name":"/repo/packages/foo/src/bar.test.ts","assertionResults":[{"status":"failed","fullName":"bar should work","failureMessages":["Error: expected true\\n    at /repo/packages/foo/src/bar.test.ts:12:3"]}]}]}',
    ].join('\n');

    const result = parseMoonJestOutput(output);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].passed).toBe(false);
    expect(result.tasks[0].failures).toHaveLength(1);
    expect(result.tasks[0].failures[0]).toMatchObject({
      file: 'packages/foo/src/bar.test.ts',
      line: 12,
      name: 'bar should work',
    });
  });

  it('reports parse failures for malformed JSON', () => {
    const output = '@kbn/bad:jest | {not valid json}';

    const result = parseMoonJestOutput(output);
    expect(result.parseFailures).toHaveLength(1);
    expect(result.parseFailures[0]).toContain('Failed to parse Jest JSON from project @kbn/bad');
  });

  it('flags a Jest worker OOM signature as failure with oom set', () => {
    const output = [
      'fail RunTask(@kbn/foo:jest) (2s, abc123)',
      '@kbn/foo:jest | {"success":false,"numTotalTests":2,"numPassedTests":1,"numFailedTests":1,"testResults":[{"name":"/repo/packages/foo/src/bar.test.ts","assertionResults":[{"status":"failed","fullName":"bar should work","failureMessages":["Jest worker encountered 4 child process exceptions, exceeding retry limit"]}]}]}',
    ].join('\n');

    const result = parseMoonJestOutput(output);
    expect(result.tasks[0].failures[0].oom).toBe(true);
  });

  it('flags a whole-suite crash with no assertion results as failure with oom set', () => {
    // This is the literal message jest-worker's ChildProcessWorker/NodeThreadsWorker raise
    // for a crashed/OOM-killed worker; Jest's formatTestResults flattens it into `message`.
    // The raw V8 "heap out of memory" crash text never reaches this field.
    const output = [
      'fail RunTask(@kbn/foo:jest) (2s, abc123)',
      '@kbn/foo:jest | {"success":false,"numTotalTests":0,"numPassedTests":0,"numFailedTests":0,"testResults":[{"name":"/repo/packages/foo/src/bar.test.ts","status":"failed","message":"Jest worker ran out of memory and crashed","assertionResults":[]}]}',
    ].join('\n');

    const result = parseMoonJestOutput(output);
    expect(result.tasks[0].failures).toHaveLength(1);
    expect(result.tasks[0].failures[0]).toMatchObject({
      name: 'Test suite failed to run',
      oom: true,
    });
  });

  it('does not flag a normal assertion failure as oom', () => {
    const output = [
      'fail RunTask(@kbn/foo:jest) (2s, abc123)',
      '@kbn/foo:jest | {"success":false,"numTotalTests":2,"numPassedTests":1,"numFailedTests":1,"testResults":[{"name":"/repo/packages/foo/src/bar.test.ts","assertionResults":[{"status":"failed","fullName":"bar should work","failureMessages":["Error: expected true"]}]}]}',
    ].join('\n');

    const result = parseMoonJestOutput(output);
    expect(result.tasks[0].failures[0].oom).toBe(false);
  });
});

describe('buildMoonJestWarnings', () => {
  it('flags a raw V8 heap crash when no tasks parsed and exit code is non-zero', () => {
    const output = [
      '<--- Last few GCs --->',
      'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
    ].join('\n');

    const warnings = buildMoonJestWarnings({
      output,
      exitCode: 134,
      taskCount: 0,
      parseFailures: [],
    });

    expect(warnings?.[0]).toContain('out-of-memory crash signature');
  });

  it('falls back to a generic message when no tasks parsed and no OOM signature present', () => {
    const warnings = buildMoonJestWarnings({
      output: 'some unrelated crash output',
      exitCode: 1,
      taskCount: 0,
      parseFailures: [],
    });

    expect(warnings?.[0]).toContain('no Jest task output was parsed');
  });

  it('returns undefined when tasks parsed and there are no parse failures', () => {
    const warnings = buildMoonJestWarnings({
      output: '',
      exitCode: 0,
      taskCount: 1,
      parseFailures: [],
    });

    expect(warnings).toBeUndefined();
  });
});

describe('computeJestParallelism', () => {
  let cpusSpy: jest.SpyInstance;
  let memSpy: jest.SpyInstance;

  const GB = 1024 * 1024 * 1024;

  beforeEach(() => {
    cpusSpy = jest.spyOn(Os, 'cpus').mockReturnValue(new Array(8).fill({}) as any);
    // Plenty of RAM by default so these tests exercise the CPU-bound path only.
    memSpy = jest.spyOn(Os, 'totalmem').mockReturnValue(64 * GB);
  });

  afterEach(() => {
    cpusSpy.mockRestore();
    memSpy.mockRestore();
  });

  it('caps Moon concurrency at 2', () => {
    const { concurrency } = computeJestParallelism(10);
    expect(concurrency).toBe(2);
  });

  it('uses single concurrency for 1 task', () => {
    const { concurrency, maxWorkers } = computeJestParallelism(1);
    expect(concurrency).toBe(1);
    expect(maxWorkers).toBe(8);
  });

  it('splits CPUs across concurrent slots', () => {
    const { concurrency, maxWorkers } = computeJestParallelism(4);
    expect(concurrency).toBe(2);
    expect(maxWorkers).toBe(4);
  });

  it('ensures maxWorkers is at least 2', () => {
    cpusSpy.mockReturnValue(new Array(2).fill({}) as any);
    const { maxWorkers } = computeJestParallelism(10);
    expect(maxWorkers).toBe(2);
  });

  it('caps maxWorkers by available memory on high-core, low-RAM machines', () => {
    cpusSpy.mockReturnValue(new Array(16).fill({}) as any);
    memSpy.mockReturnValue(16 * GB);
    const { concurrency, maxWorkers } = computeJestParallelism(1);
    expect(concurrency).toBe(1);
    // Without the memory bound this would be 16 (one worker per CPU).
    expect(maxWorkers).toBe(3);
  });
});
