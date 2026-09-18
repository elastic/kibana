/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import nock from 'nock';
import { BuildkiteClient } from '../buildkite/client.ts';
import { runBuildSummary } from './run.ts';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn(),
}));

const execFileSyncMock = execFileSync as jest.MockedFunction<typeof execFileSync>;

const BASE_URL = 'https://api.buildkite.com';
const PIPELINE = 'kibana-pull-request';
const BUILD_PATH = `/v2/organizations/elastic/pipelines/${PIPELINE}/builds/7`;
const OUT_DIR = 'target/ci-summary-test';
const SCHEMA_PATH = join(__dirname, 'schema.json');
const NOW = new Date('2026-01-01T01:00:00.000Z');
const ESC = '\u001b';
const ENV = {
  BUILDKITE_PIPELINE_SLUG: PIPELINE,
  BUILDKITE_BUILD_NUMBER: '7',
  BUILDKITE_JOB_ID: 'post-build',
};

const typesLog = [
  '~~~ Running commands',
  '--- Bootstrap',
  'ok',
  `--- Check Types`,
  `${ESC}[31msrc/a.ts(1,2): error TS2322: nope${ESC}[0m`,
  '🚨 Error: The command exited with status 2',
  '~~~ Running global post-command hook',
].join('\n');

const build = {
  id: 'build-uuid',
  number: 7,
  state: 'running',
  web_url: `https://buildkite.com/elastic/${PIPELINE}/builds/7`,
  branch: 'main',
  commit: 'abc',
  started_at: '2026-01-01T00:00:00.000Z',
  finished_at: null,
  pipeline: { slug: PIPELINE },
  pull_request: { id: '4242', base: 'main', repository: 'elastic/kibana' },
  jobs: [
    {
      id: 'ok',
      type: 'script',
      name: 'Lint',
      step_key: 'lint',
      state: 'passed',
      exit_status: 0,
      web_url: 'https://bk/#ok',
      retried: false,
      retries_count: 0,
      soft_failed: false,
    },
    {
      id: 'types',
      type: 'script',
      name: 'Check Types',
      step_key: 'check_types',
      state: 'failed',
      exit_status: 2,
      web_url: 'https://bk/#types',
      retried: false,
      retries_count: 0,
      soft_failed: false,
    },
    {
      id: 'ftr',
      type: 'script',
      name: 'FTR',
      step_key: 'ftr',
      state: 'failed',
      exit_status: 1,
      web_url: 'https://bk/#ftr',
      retried: false,
      retries_count: 0,
      soft_failed: false,
    },
  ],
};

interface RunCall {
  file: string;
  args: string[];
}

describe('runBuildSummary', () => {
  let client: BuildkiteClient;
  let calls: RunCall[];
  let exec: jest.Mock;

  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());

  beforeEach(() => {
    calls = [];
    exec = jest.fn();
    execFileSyncMock.mockReset();
    client = new BuildkiteClient({ baseUrl: BASE_URL, token: 'token', exec });
    rmSync(OUT_DIR, { recursive: true, force: true });

    nock(BASE_URL).get(BUILD_PATH).query({ include_retried_jobs: 'true' }).reply(200, build);
    nock(BASE_URL).get(`${BUILD_PATH}/jobs/types/log`).reply(200, typesLog);
    nock(BASE_URL).get(`${BUILD_PATH}/jobs/ftr/log`).reply(200, '--- FTR\nfailed test');
  });

  afterEach(() => {
    nock.cleanAll();
    rmSync(OUT_DIR, { recursive: true, force: true });
  });

  const artifactsReply = (extra: object[] = []) => [
    {
      id: 'tf-1',
      job_id: 'ftr',
      path: 'target/test_failures/ftr_abc.json',
      filename: 'ftr_abc.json',
    },
    ...extra,
  ];

  const logArtifacts = () => [
    {
      id: 'log-types',
      job_id: 'post-build',
      path: `${OUT_DIR}/logs/types.txt`,
      filename: 'types.txt',
    },
    { id: 'log-ftr', job_id: 'post-build', path: `${OUT_DIR}/logs/ftr.txt`, filename: 'ftr.txt' },
    // Same filename from another job must not be picked up.
    {
      id: 'other',
      job_id: 'someone-else',
      path: `${OUT_DIR}/logs/types.txt`,
      filename: 'types.txt',
    },
  ];

  const run = (file: string, args: string[]) => {
    calls.push({ file, args });
    if (file.endsWith('download_artifact.sh')) {
      const dir = args[args.length - 1];
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'ftr_abc.json'),
        JSON.stringify({
          jobId: 'ftr',
          name: 'a test',
          githubIssue: 'https://github.com/elastic/kibana/issues/9',
        })
      );
    }
  };

  it('produces the manifest, uploads log tails and publishes to the deterministic URLs', async () => {
    nock(BASE_URL)
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, artifactsReply())
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, artifactsReply(logArtifacts()));

    const { manifest, url } = await runBuildSummary({
      client,
      run,
      env: ENV,
      now: () => NOW,
      schemaPath: SCHEMA_PATH,
      outDir: OUT_DIR,
      log: () => {},
    });

    expect(url).toBe('https://ci-artifacts.kibana.dev/ci-summary/build/build-uuid.json');
    expect(manifest.complete).toBe(true);
    expect(manifest.build).toMatchObject({ state: 'failed', prNumber: 4242 });

    const byId = Object.fromEntries(manifest.jobs.map((j) => [j.id, j]));
    expect(byId.types).toMatchObject({
      failureKind: 'command_failed',
      failingSection: '--- Check Types',
      logTailUrl: `https://buildkite.com/organizations/elastic/pipelines/${PIPELINE}/builds/7/jobs/post-build/artifacts/log-types`,
    });
    expect(byId.ftr).toMatchObject({
      failureKind: 'test_failures',
      testFailures: { count: 1, githubIssues: ['https://github.com/elastic/kibana/issues/9'] },
      logTailUrl: expect.stringContaining('/artifacts/log-ftr'),
    });

    expect(readFileSync(join(OUT_DIR, 'logs/types.txt'), 'utf8')).toBe(
      '--- Check Types\nsrc/a.ts(1,2): error TS2322: nope\n'
    );
    expect(JSON.parse(readFileSync(join(OUT_DIR, 'summary.json'), 'utf8'))).toEqual(manifest);

    expect(exec).toHaveBeenCalledWith(
      `buildkite-agent artifact upload '${OUT_DIR}/logs/*.txt'`,
      expect.anything()
    );
    expect(calls).toEqual([
      {
        file: '.buildkite/scripts/common/download_artifact.sh',
        args: ['--include-retried-jobs', 'target/test_failures/*.json', `${OUT_DIR}/test_failures`],
      },
      {
        file: '.buildkite/scripts/common/activate_service_account.sh',
        args: ['gs://ci-artifacts.kibana.dev'],
      },
      {
        file: 'gcloud',
        args: [
          'storage',
          'cp',
          '--no-user-output-enabled',
          `${OUT_DIR}/summary.json`,
          'gs://ci-artifacts.kibana.dev/ci-summary/build/build-uuid.json',
        ],
      },
      {
        file: 'gcloud',
        args: [
          'storage',
          'cp',
          '--no-user-output-enabled',
          SCHEMA_PATH,
          'gs://ci-artifacts.kibana.dev/ci-summary/schema/v1.json',
        ],
      },
      {
        file: 'gcloud',
        args: [
          'storage',
          'cp',
          '--cache-control=no-cache, max-age=0, no-transform',
          '--no-user-output-enabled',
          `${OUT_DIR}/summary.json`,
          'gs://ci-artifacts.kibana.dev/ci-summary/pr/4242/latest.json',
        ],
      },
      {
        file: '.buildkite/scripts/common/activate_service_account.sh',
        args: ['--unset-impersonation'],
      },
    ]);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'buildkite-agent',
      ['meta-data', 'set', 'pr_comment:ci_summary:head'],
      expect.objectContaining({
        input: '* [CI Summary](https://ci-artifacts.kibana.dev/ci-summary/pr/4242/latest.json)',
      })
    );
  });

  it('marks the manifest incomplete when test failure artifacts exist but cannot be downloaded', async () => {
    nock(BASE_URL)
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, artifactsReply())
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, artifactsReply(logArtifacts()));

    const { manifest } = await runBuildSummary({
      client,
      run: (file, args) => {
        calls.push({ file, args });
        if (file.endsWith('download_artifact.sh')) {
          throw new Error('timeout: command not found');
        }
      },
      env: ENV,
      now: () => NOW,
      schemaPath: SCHEMA_PATH,
      outDir: OUT_DIR,
      log: () => {},
    });

    expect(manifest.complete).toBe(false);
    expect(manifest.jobs.find((j) => j.id === 'ftr')).toMatchObject({
      failureKind: 'command_failed',
      logTailUrl: expect.stringContaining('/artifacts/log-ftr'),
    });
  });

  it('skips the download entirely when no test failure artifacts exist and still completes', async () => {
    nock(BASE_URL)
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, [])
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, logArtifacts());

    const { manifest } = await runBuildSummary({
      client,
      run,
      env: ENV,
      now: () => NOW,
      schemaPath: SCHEMA_PATH,
      outDir: OUT_DIR,
      log: () => {},
    });

    expect(calls.some((c) => c.file.endsWith('download_artifact.sh'))).toBe(false);
    expect(existsSync(join(OUT_DIR, 'test_failures'))).toBe(false);
    expect(manifest.complete).toBe(true);
  });

  it('keeps going when one log fetch fails and flags the manifest incomplete', async () => {
    nock.cleanAll();
    nock(BASE_URL).get(BUILD_PATH).query({ include_retried_jobs: 'true' }).reply(200, build);
    nock(BASE_URL).get(`${BUILD_PATH}/jobs/types/log`).reply(500);
    nock(BASE_URL).get(`${BUILD_PATH}/jobs/ftr/log`).reply(200, '--- FTR\nfailed test');
    nock(BASE_URL)
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, [])
      .get(`${BUILD_PATH}/artifacts`)
      .query({ per_page: 100 })
      .reply(200, logArtifacts());

    const { manifest } = await runBuildSummary({
      client,
      run,
      env: ENV,
      now: () => NOW,
      schemaPath: SCHEMA_PATH,
      outDir: OUT_DIR,
      log: () => {},
    });

    expect(manifest.complete).toBe(false);
    const byId = Object.fromEntries(manifest.jobs.map((j) => [j.id, j]));
    expect(byId.types.logTailUrl).toBeUndefined();
    expect(byId.types.failingSection).toBeNull();
    expect(byId.ftr).toMatchObject({ failingSection: '--- FTR', logTailUrl: expect.any(String) });
  });
});
