/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import Os from 'os';
import Path from 'path';
import type { Job } from '../buildkite/types/job.ts';
import { getPendingSteps, reportFailedTestIssues } from './report_failed_test_issues.ts';

const mockExecFileSync = jest.fn();
const mockGetCurrentBuild = jest.fn();
const mockSetMetadata = jest.fn();
const mockSetAnnotation = jest.fn();
const mockAnnotateTestFailures = jest.fn();

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

jest.mock('./annotate.ts', () => ({
  annotateTestFailures: (...args: unknown[]) => mockAnnotateTestFailures(...args),
}));

jest.mock('../index.ts', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    getCurrentBuild: (...args: unknown[]) => mockGetCurrentBuild(...args),
    setMetadata: (...args: unknown[]) => mockSetMetadata(...args),
    setAnnotation: (...args: unknown[]) => mockSetAnnotation(...args),
  })),
}));

let created = 0;
const job = (id: string, stepId: string, parallelGroupIndex?: number): Job =>
  ({
    id,
    name: 'FTR Configs',
    created_at: new Date(created++ * 60000).toISOString(),
    step: { id: stepId },
    parallel_group_index: parallelGroupIndex,
  } as Job);

const reporting = (scout: boolean) => JSON.stringify({ junit: !scout, scout });

const SCOUT_REPORT = '.scout/reports/scout-playwright-test-failures-run/scout-failures-run.ndjson';

describe('getPendingSteps', () => {
  const ids = (steps: ReturnType<typeof getPendingSteps>) =>
    steps.map((attempts) => attempts.map(({ job: { id } }) => id));

  it('groups retries of a step and keeps parallel jobs apart', () => {
    const build = {
      jobs: [job('a1', 'ftr', 0), job('a2', 'ftr', 0), job('b1', 'ftr', 1)],
      meta_data: {
        a1_github_test_reporting: reporting(false),
        a2_github_test_reporting: reporting(false),
        b1_github_test_reporting: reporting(false),
      },
    };

    expect(ids(getPendingSteps(build))).toEqual([['a1', 'a2'], ['b1']]);
  });

  it('orders the attempts of a step by creation time', () => {
    const [a1, a2, a3] = [job('a1', 'ftr'), job('a2', 'ftr'), job('a3', 'ftr')];
    const build = {
      jobs: [a3, a1, a2],
      meta_data: {
        a1_github_test_reporting: reporting(false),
        a2_github_test_reporting: reporting(false),
        a3_github_test_reporting: reporting(false),
        a2_github_test_reported: 'true',
      },
    };

    expect(ids(getPendingSteps(build))).toEqual([['a3']]);
  });

  it('skips steps whose latest attempt was reported and jobs that recorded no reports', () => {
    const build = {
      jobs: [job('a1', 'ftr'), job('c1', 'other')],
      meta_data: {
        a1_github_test_reporting: reporting(false),
        a1_github_test_reported: 'true',
      },
    };

    expect(getPendingSteps(build)).toEqual([]);
  });

  it('only includes attempts after the most recently reported attempt', () => {
    const build = {
      jobs: [job('a1', 'ftr'), job('a2', 'ftr'), job('a3', 'ftr'), job('a4', 'ftr')],
      meta_data: {
        a1_github_test_reporting: reporting(false),
        a2_github_test_reporting: reporting(false),
        a3_github_test_reporting: reporting(false),
        a4_github_test_reporting: reporting(false),
        a1_github_test_reported: 'true',
        a3_github_test_reported: 'true',
      },
    };

    expect(ids(getPendingSteps(build))).toEqual([['a4']]);
  });
});

describe('reportFailedTestIssues', () => {
  const WEB_URL = 'https://buildkite.com/elastic/kibana/builds/1';
  let originalCwd: string;
  let directory: string;
  let failuresByJob: Record<string, number>;
  let failingReporterJob: string | undefined;
  let failingDownloadJob: string | undefined;

  const run = (
    reported: string[] = [],
    jobs = [job('a1', 'step-a'), job('a2', 'step-a'), job('b1', 'step-b')]
  ) => {
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
    failingDownloadJob = undefined;
    jest.clearAllMocks();
    mockSetAnnotation.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockExecFileSync.mockImplementation((command: string, args: string[], options) => {
      if (command.endsWith('download_artifact.sh')) {
        const [pattern, destination, , jobId] = args;
        if (jobId === failingDownloadJob) {
          throw new Error('download failed');
        }
        if (pattern.startsWith('.scout/')) {
          mkdirSync(Path.dirname(Path.join(destination, SCOUT_REPORT)), { recursive: true });
          writeFileSync(Path.join(destination, SCOUT_REPORT), '{"id":"scout-failure"}\n');
          return;
        }
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
      } else if (command === process.execPath) {
        const metadataArg = args.find((arg) => arg.startsWith('--report-job-metadata='));
        if (!metadataArg) {
          throw new Error('Missing report job metadata');
        }
        const origins: Record<string, { jobId: string }> = JSON.parse(
          readFileSync(metadataArg.slice('--report-job-metadata='.length), 'utf8')
        );
        mkdirSync(Path.join(options.cwd, 'target/test_failures'), { recursive: true });
        for (const { jobId } of Object.values(origins)) {
          for (let index = 0; index < (failuresByJob[jobId] ?? 1); index++) {
            writeFileSync(
              Path.join(options.cwd, `target/test_failures/${jobId}_${index}.json`),
              JSON.stringify({
                jobId,
                githubIssue: `https://github.com/elastic/kibana/issues/${jobId}`,
              })
            );
          }
        }
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
    expect(mockAnnotateTestFailures).toHaveBeenCalledWith([
      expect.stringMatching(/a2\/target\/test_failures\/a1_0\.json$/),
      expect.stringMatching(/a2\/target\/test_failures\/a2_0\.json$/),
      expect.stringMatching(/b1\/target\/test_failures\/b1_0\.json$/),
    ]);
  });

  it('downloads and reports eligible Scout failures and refreshes the failure summaries', async () => {
    mockGetCurrentBuild.mockResolvedValue({
      web_url: WEB_URL,
      jobs: [job('scout1', 'scout')],
      meta_data: { scout1_github_test_reporting: reporting(true) },
    });

    await reportFailedTestIssues();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '.buildkite/scripts/common/download_artifact.sh',
      [
        '.scout/reports/scout-playwright-test-failures-*/*',
        expect.any(String),
        '--step',
        'scout1',
        '--include-retried-jobs',
      ],
      { stdio: 'inherit' }
    );
    const [, args, options] = mockExecFileSync.mock.calls.find(
      ([command]) => command === process.execPath
    );
    expect(args).toEqual([
      expect.any(String),
      `--build-url=${WEB_URL}#scout1`,
      expect.stringContaining('--report-job-metadata='),
      '--no-index-errors',
      'attempts/*/.scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson',
    ]);
    expect(readFileSync(Path.join(options.cwd, 'attempts/scout1', SCOUT_REPORT), 'utf8')).toBe(
      '{"id":"scout-failure"}\n'
    );
    expect(mockSetMetadata).toHaveBeenCalledWith('scout1_github_test_reported', 'true');
    expect(mockAnnotateTestFailures).toHaveBeenCalledWith([
      expect.stringMatching(/scout1\/target\/test_failures\/scout1_0\.json$/),
    ]);
  });

  it('keeps the originating job link when an earlier attempt fails and its retry passes', async () => {
    failuresByJob = { a1: 1, a2: 0, b1: 0 };

    await run();

    const [, args] = mockExecFileSync.mock.calls.find(([command]) => command === process.execPath);
    const metadataArg: string = args.find((arg: string) =>
      arg.startsWith('--report-job-metadata=')
    );
    const origins = JSON.parse(
      readFileSync(metadataArg.slice('--report-job-metadata='.length), 'utf8')
    );
    expect(Object.values(origins)).toEqual([
      expect.objectContaining({ jobId: 'a1', jobUrl: `${WEB_URL}#a1` }),
      expect.objectContaining({ jobId: 'a2', jobUrl: `${WEB_URL}#a2` }),
    ]);
    expect(mockAnnotateTestFailures).toHaveBeenCalledWith([
      expect.stringMatching(/a2\/target\/test_failures\/a1_0\.json$/),
    ]);
    expect(reporterBuildUrls()).toEqual([`--build-url=${WEB_URL}#a2`, `--build-url=${WEB_URL}#b1`]);
  });

  it('keeps a failed step pending and skips reported steps when Post-Build is retried', async () => {
    failingReporterJob = 'a2';

    await run();
    expect(mockSetAnnotation).toHaveBeenCalledWith(
      'failed-test-github-issues-errors',
      'warning',
      'Failed to report failed tests to GitHub for 1 steps, see the Post-Build log.'
    );
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

  it('reports the other steps and keeps a step pending when its reports fail to download', async () => {
    failingDownloadJob = 'a1';

    await run();
    expect(mockSetAnnotation).toHaveBeenCalledWith(
      'failed-test-github-issues-errors',
      'warning',
      'Failed to report failed tests to GitHub for 1 steps, see the Post-Build log.'
    );

    expect(reporterBuildUrls()).toEqual([`--build-url=${WEB_URL}#b1`]);
    expect(mockSetMetadata.mock.calls).toEqual([['b1_github_test_reported', 'true']]);
  });

  it('only downloads and reports new test-step retries after an earlier Post-Build run', async () => {
    failuresByJob = { a1: 3, a2: 2, b1: 0, a3: 1 };
    await run();
    mockExecFileSync.mockClear();
    mockSetMetadata.mockClear();

    await run(
      ['a2', 'b1'],
      [job('a1', 'step-a'), job('a2', 'step-a'), job('a3', 'step-a'), job('b1', 'step-b')]
    );

    expect(
      mockExecFileSync.mock.calls
        .filter(([command]) => command.endsWith('download_artifact.sh'))
        .map(([, args]) => args[3])
    ).toEqual(['a3']);
    expect(reporterBuildUrls()).toEqual([`--build-url=${WEB_URL}#a3`]);
    expect(mockSetMetadata.mock.calls).toEqual([['a3_github_test_reported', 'true']]);
  });

  it('stops reporting further steps once 20 failures were reported', async () => {
    failuresByJob = { a1: 12, a2: 8, b1: 1 };

    await run();

    expect(reporterBuildUrls()).toEqual([`--build-url=${WEB_URL}#a2`]);
    expect(mockSetMetadata.mock.calls).toEqual([['a2_github_test_reported', 'true']]);
    expect(mockSetAnnotation).toHaveBeenCalledWith(
      'failed-test-github-issues-limit',
      'warning',
      'Stopped reporting to GitHub after 20 failed tests, 1 steps were not reported.'
    );
  });
});
