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
import {
  countFailures,
  getPendingSteps,
  reportFailedTestIssues,
} from './report_failed_test_issues.ts';

const mockExecFileSync = jest.fn();
const mockGetCurrentBuild = jest.fn();
const mockGetArtifactsForCurrentBuild = jest.fn();
const mockSetMetadata = jest.fn();
const mockSetAnnotation = jest.fn();

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

jest.mock('../index.ts', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    getCurrentBuild: (...args: unknown[]) => mockGetCurrentBuild(...args),
    getArtifactsForCurrentBuild: (...args: unknown[]) => mockGetArtifactsForCurrentBuild(...args),
    setMetadata: (...args: unknown[]) => mockSetMetadata(...args),
    setAnnotation: (...args: unknown[]) => mockSetAnnotation(...args),
  })),
}));

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

describe('reportFailedTestIssues', () => {
  const WEB_URL = 'https://buildkite.com/elastic/kibana/builds/1';
  let originalCwd: string;
  let directory: string;
  let failuresByJob: Record<string, number>;
  let failingReporterJob: string | undefined;

  const run = (reported: string[] = []) => {
    const jobs = [job('a1', 'step-a'), job('a2', 'step-a'), job('b1', 'step-b')];
    mockGetCurrentBuild.mockResolvedValue({
      web_url: WEB_URL,
      jobs,
      meta_data: {
        ...Object.fromEntries(
          jobs.map(({ id }) => [`${id}_github_test_reporting`, reporting(false)])
        ),
        ...Object.fromEntries(reported.map((id) => [`${id}_github_test_reported`, 'true'])),
      },
    });
    mockGetArtifactsForCurrentBuild.mockResolvedValue(
      jobs.map(({ id }) => artifact(id, `target/junit/0/TEST-${id}.xml`))
    );
    return reportFailedTestIssues();
  };

  const reporterBuildUrls = (): string[] =>
    mockExecFileSync.mock.calls
      .filter(([command]) => command === process.execPath)
      .map(([, args]) => args.find((arg: string) => arg.startsWith('--build-url=')));

  beforeEach(() => {
    originalCwd = process.cwd();
    directory = mkdtempSync(Path.join(Os.tmpdir(), 'report-failed-test-issues-'));
    process.chdir(directory);
    failuresByJob = {};
    failingReporterJob = undefined;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockExecFileSync.mockImplementation((command: string, args: string[]) => {
      if (command.endsWith('download_artifact.sh')) {
        const [, destination, , jobId] = args;
        mkdirSync(Path.join(destination, 'target/junit/0'), { recursive: true });
        writeFileSync(
          Path.join(destination, `target/junit/0/TEST-${jobId}.xml`),
          '<testsuite>' +
            '<testcase name="t"><failure>x</failure></testcase>'.repeat(failuresByJob[jobId] ?? 1) +
            '</testsuite>'
        );
      } else if (
        failingReporterJob &&
        args.includes(`--build-url=${WEB_URL}#${failingReporterJob}`)
      ) {
        throw new Error('reporter failed');
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    rmSync(directory, { recursive: true, force: true });
  });

  it('reports each step once, with all of its attempts, and marks the latest attempt reported', async () => {
    await run();

    expect(reporterBuildUrls()).toEqual([`--build-url=${WEB_URL}#a2`, `--build-url=${WEB_URL}#b1`]);
    expect(mockSetMetadata.mock.calls).toEqual([
      ['a2_github_test_reported', 'true'],
      ['b1_github_test_reported', 'true'],
    ]);
  });

  it('keeps a failed step pending and skips reported steps when Post-Build is retried', async () => {
    failingReporterJob = 'a2';

    await expect(run()).rejects.toThrow('Failed to report failed tests for 1 steps');
    expect(mockSetMetadata.mock.calls).toEqual([['b1_github_test_reported', 'true']]);

    mockExecFileSync.mockClear();
    mockSetMetadata.mockClear();
    failingReporterJob = undefined;

    await run(['b1']);
    expect(reporterBuildUrls()).toEqual([`--build-url=${WEB_URL}#a2`]);
    expect(mockSetMetadata.mock.calls).toEqual([['a2_github_test_reported', 'true']]);

    mockExecFileSync.mockClear();
    await run(['a2', 'b1']);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('skips reporting and fails when the failures of all reports exceed the limit', async () => {
    failuresByJob = { a1: 30, a2: 30, b1: 0 };

    await expect(run()).rejects.toThrow('60 failed tests exceed the GitHub reporting limit');

    expect(reporterBuildUrls()).toEqual([]);
    expect(mockSetMetadata).not.toHaveBeenCalled();
    expect(mockSetAnnotation).toHaveBeenCalledWith(
      'failed-test-github-issues',
      'error',
      expect.stringContaining('Skipped reporting 60 failed tests')
    );
  });

  it('reports when the failures of all reports are exactly at the limit', async () => {
    failuresByJob = { a1: 25, a2: 24, b1: 1 };

    await run();

    expect(reporterBuildUrls()).toHaveLength(2);
  });
});
