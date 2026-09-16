/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import type { TestFailure } from '../test-failures/annotate.ts';
import type { CiSummaryFailureKind } from './types.ts';
import {
  classifyJob,
  collectSummary,
  selectLogTailJobs,
  serializeWithinCap,
  MAX_LOG_TAIL_JOBS,
} from './collect.ts';

// The published schema is open (additive fields allowed); validate here against a closed
// clone so a producer field missing from schema.json fails the test instead of drifting.
const closeSchema = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map(closeSchema);
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = closeSchema(value);
  }
  if ('properties' in out) {
    out.additionalProperties = false;
  }
  return out;
};

const schema = closeSchema(JSON.parse(readFileSync(join(__dirname, 'schema.json'), 'utf8')));
const validate = new Ajv({
  strict: true,
  allErrors: true,
  formats: { 'date-time': true, uri: true },
}).compile(schema as object);

const job = (overrides: Partial<Job>): Job =>
  ({
    id: 'job-1',
    type: 'script',
    name: 'Check Types',
    step_key: 'check_types',
    state: 'passed',
    exit_status: 0,
    started_at: '2026-01-01T00:00:00.000Z',
    finished_at: '2026-01-01T00:10:00.000Z',
    web_url: 'https://buildkite.com/elastic/kibana-pull-request/builds/1#job-1',
    retried: false,
    retries_count: 0,
    soft_failed: false,
    ...overrides,
  } as Job);

const build = (jobs: Job[], overrides: Partial<Build> = {}): Build =>
  ({
    id: 'build-uuid',
    number: 1,
    state: 'running',
    web_url: 'https://buildkite.com/elastic/kibana-pull-request/builds/1',
    branch: 'main',
    commit: 'abc',
    started_at: '2026-01-01T00:00:00.000Z',
    finished_at: null,
    pipeline: { slug: 'kibana-pull-request' },
    jobs,
    ...overrides,
  } as unknown as Build);

const NOW = new Date('2026-01-01T01:00:00.000Z');

describe('classifyJob', () => {
  it.each<[Partial<Job>, number, CiSummaryFailureKind | null]>([
    [{ state: 'passed' }, 0, null],
    [{ state: 'skipped' }, 0, null],
    [{ state: 'canceled' }, 0, 'canceled'],
    [{ state: 'timed_out', exit_status: -1 }, 0, 'timeout'],
    [{ state: 'failed', exit_status: -1 }, 0, 'agent_lost'],
    [{ state: 'failed', exit_status: 1 }, 2, 'test_failures'],
    [{ state: 'failed', exit_status: 1 }, 0, 'command_failed'],
    [{ state: 'failed', exit_status: 1, soft_failed: true }, 0, 'command_failed'],
  ])('%j with %d test failures -> %s', (overrides, failures, expected) => {
    expect(classifyJob(job(overrides), failures)).toBe(expected);
  });
});

describe('selectLogTailJobs', () => {
  it('skips passed, retried and non-script jobs and puts hard failures before soft ones', () => {
    const { jobs: selected, skipped } = selectLogTailJobs([
      job({ id: 'soft', state: 'failed', soft_failed: true }),
      job({ id: 'ok' }),
      job({ id: 'old', state: 'failed', retried: true }),
      job({ id: 'wait', type: 'waiter', state: 'failed' }),
      job({ id: 'hard', state: 'failed' }),
    ]);
    expect(selected.map((j) => j.id)).toEqual(['hard', 'soft']);
    expect(skipped).toBe(0);
  });

  it('caps the number of jobs', () => {
    const many = Array.from({ length: MAX_LOG_TAIL_JOBS + 5 }, (_, i) =>
      job({ id: `j${i}`, state: 'failed' })
    );
    expect(selectLogTailJobs(many)).toMatchObject({ skipped: 5 });
    expect(selectLogTailJobs(many).jobs).toHaveLength(MAX_LOG_TAIL_JOBS);
  });
});

describe('collectSummary', () => {
  const failure = (jobId: string, githubIssue?: string): TestFailure =>
    ({ jobId, name: 't', githubIssue } as TestFailure);

  it('produces a schema-valid manifest with per-job detail', () => {
    const b = build(
      [
        job({ id: 'pass' }),
        job({ id: 'flaky-old', state: 'failed', exit_status: 1, retried: true }),
        job({ id: 'flaky-new', retries_count: 1 }),
        job({
          id: 'ftr',
          name: 'FTR Group 3',
          state: 'failed',
          exit_status: 1,
          finished_at: null as unknown as string,
        }),
        job({ id: 'types', state: 'failed', exit_status: 2 }),
        job({ id: 'soft', state: 'failed', exit_status: 1, soft_failed: true }),
        job({ id: 'skip', state: 'broken', exit_status: null }),
        job({ id: 'wait', type: 'waiter' }),
        job({ id: 'post-build', name: 'Post-Build', state: 'running', exit_status: null }),
      ],
      { pull_request: { id: '4242', base: 'main', repository: 'elastic/kibana' } }
    );

    const manifest = collectSummary({
      build: b,
      success: false,
      testFailures: [
        failure('ftr', 'https://github.com/elastic/kibana/issues/1'),
        failure('ftr', 'https://github.com/elastic/kibana/issues/1'),
        failure('ftr'),
      ],
      logs: new Map([
        ['types', { failingSection: '--- Check Types', logTailUrl: 'https://bk/artifact/1' }],
        ['ftr', { failingSection: '--- secret=abc?x', logTailUrl: 'https://bk/artifact/2' }],
      ]),
      complete: true,
      now: NOW,
    });

    expect(validate(manifest)).toBe(true);
    expect(validate.errors).toBeNull();

    expect(manifest.build).toMatchObject({
      id: 'build-uuid',
      pipeline: 'kibana-pull-request',
      prNumber: 4242,
      state: 'failed',
      finishedAt: NOW.toISOString(),
      durationMs: 60 * 60 * 1000,
    });
    expect(manifest.summary).toEqual({
      total: 7,
      passed: 2,
      failed: 2,
      softFailed: 1,
      skipped: 1,
      canceled: 0,
      unfinished: 1,
      retried: 1,
    });

    const byId = Object.fromEntries(manifest.jobs.map((j) => [j.id, j]));
    expect(byId.wait).toBeUndefined();
    expect(byId.ftr).toMatchObject({
      failureKind: 'test_failures',
      failingSection: null,
      durationMs: null,
      logTailUrl: 'https://bk/artifact/2',
      testFailures: {
        count: 3,
        githubIssues: ['https://github.com/elastic/kibana/issues/1'],
        artifactGlob: 'target/test_failures/ftr_*.json',
      },
    });
    expect(byId.types).toMatchObject({
      failureKind: 'command_failed',
      failingSection: '--- Check Types',
      logTailUrl: 'https://bk/artifact/1',
    });
    expect(byId.types.testFailures).toBeUndefined();
    expect(byId.soft).toMatchObject({ state: 'soft_failed', failureKind: 'command_failed' });
    expect(byId['flaky-old']).toMatchObject({ state: 'failed', retried: true });
    expect(byId['flaky-new']).toMatchObject({ state: 'passed', retryCount: 1 });
  });

  it('reports a passed build with no PR', () => {
    const manifest = collectSummary({
      build: build([job({ id: 'a' })]),
      success: true,
      testFailures: [],
      logs: new Map(),
      complete: true,
      now: NOW,
    });
    expect(validate(manifest)).toBe(true);
    expect(manifest.build.prNumber).toBeNull();
    expect(manifest.build.state).toBe('passed');
  });
});

describe('serializeWithinCap', () => {
  const failing = build(
    Array.from({ length: 40 }, (_, i) => job({ id: `job-${i}`, state: 'failed', exit_status: 1 }))
  );
  const manifest = collectSummary({
    build: failing,
    success: false,
    testFailures: failing.jobs.flatMap(
      (j) =>
        Array.from({ length: 5 }, (_, i) => ({
          jobId: j.id,
          name: `t${i}`,
          githubIssue: `https://github.com/elastic/kibana/issues/${i}`,
        })) as TestFailure[]
    ),
    logs: new Map(
      failing.jobs.map((j) => [j.id, { failingSection: '--- FTR', logTailUrl: 'https://bk/a' }])
    ),
    complete: true,
    now: NOW,
  });

  it('returns the manifest untouched when under the cap', () => {
    const { json, trimmed } = serializeWithinCap(manifest);
    expect(trimmed).toBe(false);
    expect(JSON.parse(json)).toEqual(manifest);
  });

  it('drops optional detail in order and flags the manifest incomplete', () => {
    const full = Buffer.byteLength(JSON.stringify(manifest, null, 2));
    const { json, trimmed } = serializeWithinCap(manifest, full - 1);
    const out = JSON.parse(json);
    expect(trimmed).toBe(true);
    expect(out.complete).toBe(false);
    expect(
      out.jobs.every(
        (j: { testFailures: { githubIssues: string[] } }) =>
          j.testFailures.githubIssues.length === 0
      )
    ).toBe(true);
    expect(out.jobs.some((j: { logTailUrl?: string }) => j.logTailUrl)).toBe(true);
    expect(validate(out)).toBe(true);

    const tighter = serializeWithinCap(manifest, 1);
    const smallest = JSON.parse(tighter.json);
    expect(smallest.jobs.every((j: { logTailUrl?: string }) => j.logTailUrl === undefined)).toBe(
      true
    );
    expect(validate(smallest)).toBe(true);
  });
});
