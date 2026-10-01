/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import Os from 'os';
import Path from 'path';
import type { Artifact } from '../buildkite/types/artifact.ts';
import type { Job } from '../buildkite/types/job.ts';
import { countFailures, getPendingSteps } from './report_failed_test_issues.ts';

const job = (id: string, stepId: string, parallelGroupIndex?: number): Job =>
  ({ id, step: { id: stepId }, parallel_group_index: parallelGroupIndex } as Job);

const artifact = (jobId: string, path: string): Artifact =>
  ({ job_id: jobId, path, state: 'finished' } as Artifact);

const reporting = (scout: boolean) => JSON.stringify({ scout, label: 'FTR Configs' });

const SCOUT_REPORT = '.scout/reports/scout-playwright-test-failures-run/scout-failures-run.ndjson';

describe('getPendingSteps', () => {
  it('groups retries of a step and keeps parallel jobs apart', () => {
    const build = {
      jobs: [job('a1', 'ftr', 0), job('a2', 'ftr', 0), job('b1', 'ftr', 1)],
      meta_data: {
        a1_github_test_reporting: reporting(false),
        a2_github_test_reporting: reporting(false),
        b1_github_test_reporting: reporting(false),
      },
    };
    const artifacts = ['a1', 'a2', 'b1'].map((id) => artifact(id, 'target/junit/TEST-a.xml'));

    expect(
      getPendingSteps(build, artifacts).map((attempts) => attempts.map(({ job: { id } }) => id))
    ).toEqual([['a1', 'a2'], ['b1']]);
  });

  it('skips steps whose latest attempt was reported and jobs without reports', () => {
    const build = {
      jobs: [job('a1', 'ftr'), job('b1', 'jest'), job('c1', 'other')],
      meta_data: {
        a1_github_test_reporting: reporting(false),
        a1_github_test_reported: 'true',
        b1_github_test_reporting: reporting(false),
      },
    };

    expect(
      getPendingSteps(build, [
        artifact('a1', 'target/junit/TEST-a.xml'),
        artifact('c1', 'target/junit/TEST-c.xml'),
      ])
    ).toEqual([]);
  });

  it('only includes Scout reports for eligible attempts', () => {
    const build = {
      jobs: [job('a1', 'scout'), job('a2', 'scout')],
      meta_data: {
        a1_github_test_reporting: reporting(false),
        a2_github_test_reporting: reporting(true),
      },
    };

    expect(
      getPendingSteps(build, [artifact('a1', SCOUT_REPORT), artifact('a2', SCOUT_REPORT)]).map(
        (attempts) => attempts.map(({ job: { id }, patterns }) => ({ id, patterns }))
      )
    ).toEqual([
      [
        {
          id: 'a2',
          patterns: ['.scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson'],
        },
      ],
    ]);
  });
});

describe('countFailures', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(Path.join(Os.tmpdir(), 'count-failures-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('counts JUnit failures and Scout failure entries', async () => {
    mkdirSync(Path.join(directory, 'target/junit/nested'), { recursive: true });
    writeFileSync(
      Path.join(directory, 'target/junit/nested/TEST-a.xml'),
      '<testsuite><testcase name="a"><failure>boom</failure></testcase><testcase name="b"/><testcase name="c"><failure/></testcase></testsuite>'
    );
    mkdirSync(Path.join(directory, '.scout/reports/scout-playwright-test-failures-run'), {
      recursive: true,
    });
    writeFileSync(Path.join(directory, SCOUT_REPORT), '{"id":"a"}\n{"id":"b"}\n');

    expect(await countFailures(directory)).toBe(4);
  });
});
