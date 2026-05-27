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

import { parseMoonJestOutput, computeJestParallelism } from './run_jest_via_moon';

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
});

describe('computeJestParallelism', () => {
  let cpusSpy: jest.SpyInstance;

  beforeEach(() => {
    cpusSpy = jest.spyOn(Os, 'cpus').mockReturnValue(new Array(8).fill({}) as any);
  });

  afterEach(() => {
    cpusSpy.mockRestore();
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
});
