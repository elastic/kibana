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
import type { RunContext } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { ExistingFailedTestIssues } from './existing_failed_test_issues';
import { runFailedTestsReporterCli } from './failed_tests_reporter_cli';
import { createFailureIssue, updateFailureIssue } from './report_failure';
import { reportFailuresToFile } from './report_failures_to_file';

jest.mock('@kbn/dev-cli-runner', () => ({ run: jest.fn() }));
jest.mock('@kbn/ci-stats-reporter', () => ({
  CiStatsReporter: { fromEnv: () => ({ metrics: jest.fn() }) },
}));
jest.mock('./github_api', () => ({
  GithubApi: jest.fn().mockImplementation(() => ({ getRequestCount: () => 0 })),
}));
jest.mock('./report_failure', () => ({
  createFailureIssue: jest.fn(),
  updateFailureIssue: jest.fn(),
}));
jest.mock('./report_failures_to_file', () => ({ reportFailuresToFile: jest.fn() }));

const { run: mockRun } = jest.requireMock<{
  run: jest.Mock<void, [(context: Pick<RunContext, 'log' | 'flags'>) => Promise<void>]>;
}>('@kbn/dev-cli-runner');
const WEB_URL = 'https://buildkite.com/elastic/kibana/builds/1';

describe('failed test reporter job metadata', () => {
  let directory: string;
  let previousCwd: string;

  const run = async (withMetadata = true) => {
    runFailedTestsReporterCli();
    const [callback] = mockRun.mock.calls[0];
    await callback({
      log: new ToolingLog(),
      flags: {
        verbose: false,
        quiet: false,
        silent: false,
        debug: false,
        help: false,
        unexpected: [],
        _: [
          Path.join(directory, 'attempts/**/*.xml'),
          Path.join(directory, 'attempts/**/*.ndjson'),
        ],
        'build-url': `${WEB_URL}#a2`,
        'github-update': false,
        'report-update': false,
        'index-errors': false,
        'report-job-metadata': withMetadata ? Path.join(directory, 'report-job-metadata.json') : '',
      },
    });
  };

  const writeJUnit = (id: string, failed: boolean) =>
    writeFileSync(
      Path.join(directory, 'attempts', id, 'report.xml'),
      `<testsuite name="suite"><testcase classname="suite" name="test" time="1">${
        failed ? '<failure>boom</failure>' : ''
      }</testcase></testsuite>`
    );

  beforeEach(() => {
    previousCwd = process.cwd();
    directory = mkdtempSync(Path.join(Os.tmpdir(), 'report-job-metadata-'));
    process.chdir(directory);
    jest.clearAllMocks();
    jest.spyOn(ExistingFailedTestIssues.prototype, 'loadForFailures').mockResolvedValue();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Unexpected network request'));
    jest.mocked(createFailureIssue).mockResolvedValue({
      html_url: 'https://github.com/elastic/kibana/issues/1',
      node_id: 'issue-1',
      id: 1001,
      number: 1,
      body: 'body',
    });
    jest.mocked(updateFailureIssue).mockResolvedValue({ newBody: 'updated body', newCount: 2 });
    const origins = Object.fromEntries(
      ['a1', 'a2'].map((id) => {
        const attemptDirectory = Path.join(directory, 'attempts', id);
        mkdirSync(attemptDirectory, { recursive: true });
        return [
          attemptDirectory,
          { jobId: id, jobUrl: `${WEB_URL}#${id}`, url: WEB_URL, jobName: id },
        ];
      })
    );
    writeFileSync(Path.join(directory, 'report-job-metadata.json'), JSON.stringify(origins));
    writeJUnit('a1', true);
    writeJUnit('a2', false);
  });

  afterEach(() => {
    expect(global.fetch).not.toHaveBeenCalled();
    jest.restoreAllMocks();
    process.chdir(previousCwd);
    rmSync(directory, { recursive: true, force: true });
  });

  it('attributes a failure to its first attempt when the retry passes', async () => {
    await run();

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue).toHaveBeenCalledWith(
      `${WEB_URL}#a1`,
      expect.any(Object),
      expect.any(Object),
      '',
      '',
      ''
    );
    expect(reportFailuresToFile).toHaveBeenCalledWith(
      expect.any(ToolingLog),
      expect.arrayContaining([expect.objectContaining({ name: 'test' })]),
      expect.objectContaining({ jobId: 'a1', jobUrl: `${WEB_URL}#a1` }),
      expect.any(Object)
    );
  });

  it('shares newly created issues across attempts while using each originating job link', async () => {
    writeJUnit('a2', true);

    await run();

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(updateFailureIssue).toHaveBeenCalledWith(
      `${WEB_URL}#a2`,
      expect.objectContaining({ github: expect.objectContaining({ number: 1 }) }),
      expect.any(Object),
      '',
      '',
      expect.objectContaining({ name: 'test' })
    );
  });

  it('uses the originating job link for Scout failures too', async () => {
    writeJUnit('a1', false);
    writeFileSync(
      Path.join(directory, 'attempts/a1/report.ndjson'),
      JSON.stringify({
        id: 'scout-test',
        suite: 'Scout suite',
        title: 'test',
        target: 'local',
        command: 'scout',
        location: 'test.spec.ts:1',
        owner: [],
        duration: 1,
        error: { message: 'boom' },
        attachments: [],
        timestamp: '2026-10-13T00:00:00Z',
      }) + '\n'
    );

    await run();

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(jest.mocked(createFailureIssue).mock.calls[0][0]).toBe(`${WEB_URL}#a1`);
  });

  it('uses the original CLI build URL when no job metadata is supplied', async () => {
    await run(false);

    expect(jest.mocked(createFailureIssue).mock.calls[0][0]).toBe(`${WEB_URL}#a2`);
  });

  it('rejects reports without originating job metadata', async () => {
    writeFileSync(Path.join(directory, 'report-job-metadata.json'), '{}');

    await expect(run()).rejects.toThrow('Missing originating job metadata');
    expect(createFailureIssue).not.toHaveBeenCalled();
  });
});
