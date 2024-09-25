/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from 'chai';
import { BuildkiteClient } from './client';
import { Build } from './types/build';
import { Job } from './types/job';

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
      expect(buildStatus.success).to.eql(true);
      expect(buildStatus.hasRetries).to.eql(true);
      expect(buildStatus.hasNonPreemptionRetries).to.eql(false);
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
      expect(buildStatus.success).to.eql(true);
      expect(buildStatus.hasRetries).to.eql(true);
      expect(buildStatus.hasNonPreemptionRetries).to.eql(true);
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
      expect(buildStatus.success).to.eql(true);
      expect(buildStatus.hasRetries).to.eql(true);
      expect(buildStatus.hasNonPreemptionRetries).to.eql(true);
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
      expect(result.success).to.eql(false);
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
      expect(result.success).to.eql(true);
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
      expect(result.success).to.eql(false);
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
      expect(result.success).to.eql(true);
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
      expect(result.success).to.eql(false);
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
      expect(result.success).to.eql(false);
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
      expect(result.success).to.eql(true);
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
      expect(result.success).to.eql(true);
    });
  });
});
