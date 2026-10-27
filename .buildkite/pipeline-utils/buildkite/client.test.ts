/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { BuildkiteClient, isFullCommitSha } from './client.ts';
import type { Build } from './types/build.ts';
import type { Job } from './types/job.ts';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn(),
}));

const execFileSyncMock = execFileSync as jest.MockedFunction<typeof execFileSync>;

describe('BuildkiteClient', () => {
  let buildkite: BuildkiteClient;

  beforeEach(() => {
    buildkite = new BuildkiteClient();
  });

  describe('getBuildStatus', () => {
    it('does not have hasNonPreemptionRetries for preemption retries', async () => {
      const job: Job = {
        id: 'id-1',
        retried_in_job_id: 'id-2',
        state: 'failed',
        agent_query_rules: ['preemptible=true'],
        retried: true,
        exit_status: -1,
        type: 'script',
      } as Job;

      const retry: Job = {
        id: 'id-2',
        state: 'passed',
        agent_query_rules: ['preemptible=true'],
        type: 'script',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job, retry],
      } as Build;

      const buildStatus = buildkite.getBuildStatus(build);
      expect(buildStatus.success).toEqual(true);
      expect(buildStatus.hasRetries).toEqual(true);
      expect(buildStatus.hasNonPreemptionRetries).toEqual(false);
    });

    it('has hasNonPreemptionRetries for spot non-preemption retries', async () => {
      const job: Job = {
        id: 'id-1',
        retried_in_job_id: 'id-2',
        state: 'failed',
        agent_query_rules: ['preemptible=true'],
        retried: true,
        exit_status: 1,
        type: 'script',
      } as Job;

      const retry: Job = {
        id: 'id-2',
        state: 'passed',
        agent_query_rules: ['preemptible=true'],
        type: 'script',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job, retry],
      } as Build;

      const buildStatus = buildkite.getBuildStatus(build);
      expect(buildStatus.success).toEqual(true);
      expect(buildStatus.hasRetries).toEqual(true);
      expect(buildStatus.hasNonPreemptionRetries).toEqual(true);
    });

    it('has hasNonPreemptionRetries for non-spot retries with exit code -1', async () => {
      const job: Job = {
        id: 'id-1',
        retried_in_job_id: 'id-2',
        state: 'failed',
        retried: true,
        exit_status: -1,
        type: 'script',
      } as Job;

      const retry: Job = {
        id: 'id-2',
        state: 'passed',
        type: 'script',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job, retry],
      } as Build;

      const buildStatus = buildkite.getBuildStatus(build);
      expect(buildStatus.success).toEqual(true);
      expect(buildStatus.hasRetries).toEqual(true);
      expect(buildStatus.hasNonPreemptionRetries).toEqual(true);
    });

    it('returns failure if build is failed and all jobs passed', async () => {
      const job = {
        id: 'id_1',
        state: 'passed',
      } as Job;

      const build = {
        id: 'id',
        state: 'failed',
        jobs: [job],
      } as Build;

      const result = buildkite.getBuildStatus(build);
      expect(result.success).toEqual(false);
    });
  });

  describe('getJobStatus', () => {
    it('returns success if job is successful', async () => {
      const job = {
        id: 'id',
        state: 'passed',
        type: 'script',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).toEqual(true);
    });

    it('returns failure if job is unsuccessful', async () => {
      const job = {
        id: 'id',
        state: 'failed',
        type: 'script',
      } as Job;

      const build = {
        id: 'id',
        state: 'failed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).toEqual(false);
    });

    it('returns success if retried job is successful', async () => {
      const job = {
        id: 'id_1',
        state: 'failed',
        retried: true,
        retried_in_job_id: 'id_2',
      } as Job;

      const jobRetry = {
        id: 'id_2',
        state: 'passed',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job, jobRetry],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).toEqual(true);
    });

    it('returns failure if retried job is unsuccessful', async () => {
      const job = {
        id: 'id_1',
        state: 'failed',
        retried: true,
        retried_in_job_id: 'id_2',
      } as Job;

      const jobRetry = {
        id: 'id_2',
        state: 'failed',
      } as Job;

      const build = {
        id: 'id',
        state: 'failed',
        jobs: [job, jobRetry],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).toEqual(false);
    });

    it('returns failure if job is waiting_failed', async () => {
      const job = {
        id: 'id_1',
        state: 'waiting_failed',
      } as Job;

      const build = {
        id: 'id',
        state: 'failed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).toEqual(false);
    });

    it('returns success if job is broken but of type: manual', async () => {
      const job = {
        id: 'id',
        state: 'broken',
        type: 'manual',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).toEqual(true);
    });

    it('returns success if job is broken but has no exit status', async () => {
      const job = {
        id: 'id',
        state: 'broken',
        type: 'script',
        exit_status: null,
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).toEqual(true);
    });
  });

  describe('cancelStep', () => {
    afterEach(() => {
      execFileSyncMock.mockReset();
    });

    it('calls buildkite-agent step cancel for the specified step', () => {
      buildkite.cancelStep('step-id-1');

      expect(execFileSyncMock).toHaveBeenCalledWith(
        'buildkite-agent',
        ['step', 'cancel', '--step', 'step-id-1'],
        {
          stdio: ['pipe', 'inherit', 'inherit'],
        }
      );
    });
  });

  describe('getBuildsForCommit', () => {
    const sha = 'a'.repeat(40);
    const path = 'v2/organizations/elastic/pipelines/kibana-merge-queue/builds';

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('requests the commit and state filters', async () => {
      const builds = [{ number: 1 }, { number: 2 }] as Build[];
      const get = jest.spyOn(buildkite.http, 'get').mockResolvedValue({ data: builds });

      const result = await buildkite.getBuildsForCommit('kibana-merge-queue', sha, 'passed');

      expect(get).toHaveBeenCalledWith(path, {
        params: { commit: sha, state: 'passed' },
        timeout: 30_000,
      });
      expect(result).toEqual(builds);
    });

    it('omits the state filter when none is given', async () => {
      const get = jest.spyOn(buildkite.http, 'get').mockResolvedValue({ data: [] });

      await buildkite.getBuildsForCommit('kibana-merge-queue', sha);

      expect(get).toHaveBeenCalledWith(path, { params: { commit: sha }, timeout: 30_000 });
    });

    it('encodes the pipeline slug in the path', async () => {
      const get = jest.spyOn(buildkite.http, 'get').mockResolvedValue({ data: [] });

      await buildkite.getBuildsForCommit('a/b', sha);

      expect(get).toHaveBeenCalledWith('v2/organizations/elastic/pipelines/a%2Fb/builds', {
        params: { commit: sha },
        timeout: 30_000,
      });
    });

    it('rejects short commits', async () => {
      const get = jest.spyOn(buildkite.http, 'get');

      await expect(
        buildkite.getBuildsForCommit('kibana-merge-queue', 'a'.repeat(39))
      ).rejects.toThrow('Invalid commit hash');
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('isFullCommitSha', () => {
    it.each([
      ['a 40-character SHA-1 id', 'a'.repeat(40), true],
      ['a 64-character SHA-256 id', 'a'.repeat(64), true],
      ['a 39-character string', 'a'.repeat(39), false],
      ['a 41-character string', 'a'.repeat(41), false],
      ['a 63-character string', 'a'.repeat(63), false],
      ['a 65-character string', 'a'.repeat(65), false],
      ['an empty string', '', false],
    ])('%s', (_label, commit, expected) => {
      expect(isFullCommitSha(commit)).toBe(expected);
    });
  });
});
