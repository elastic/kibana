/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createInstance,
  CreateInstancePayload,
  CreateInstanceResponse,
  createRun,
  CreateRunPayload,
  CreateRunResponse,
  setInstanceTests,
  SetInstanceTestsPayload,
  TestState,
  updateInstanceResults,
  UpdateInstanceResultsPayload,
  UpdateInstanceResultsResponse,
  updateInstanceStdout,
} from 'cypress-cloud/lib/api';
import { getAPIBaseUrl } from 'cypress-cloud/lib/httpClient/config';
import _ from 'lodash';
import nock from 'nock';

jest.mock('cypress-cloud/lib/httpClient/config', () => ({
  getAPIBaseUrl: jest.fn().mockReturnValue('http://localhost:1234'),
}));

describe('cloud/api', () => {
  describe('createRun', () => {
    let payload: CreateRunPayload;

    beforeEach(() => {
      // @ts-ignore
      payload = {
        ci: {
          params: { foo: 'bar' },
          provider: null,
        },
        ciBuildId: 'ci-build-id',
        projectId: 'project-1',
        recordKey: 'token-1',
        commit: {
          sha: 'sha',
          branch: 'main',
          authorName: 'john',
          authorEmail: 'john@currents.dev',
          message: 'msg',
          remoteOrigin: 'https://github.com/foo/bar.git',
        },
        specs: ['foo.js', 'bar.js'],
        group: 'group-1',
        platform: {
          osName: 'linux',
          osVersion: 'Debian - 10.5',
          browserName: 'chrome',
          browserVersion: '6.4.7',
        },
        parallel: true,
        specPattern: [],
        tags: [],
        testingType: 'e2e',
      };
    });

    it('POST /runs + returns CreateRunResponse', async () => {
      const result: CreateRunResponse = {
        warnings: [],
        groupId: 'groupId1',
        machineId: 'machineId1',
        runId: 'runId1',
        runUrl: 'runUrl1',
        isNewRun: true,
      };

      nock(getAPIBaseUrl()).post('/runs', _.matches(payload)).reply(200, result);

      const run = await createRun(payload);
      expect(run).toStrictEqual(result);
    });
  });

  describe('createInstance', () => {
    let payload: CreateInstancePayload;

    beforeEach(() => {
      payload = {
        runId: '1',
        groupId: 'groupId1',
        machineId: 'machineId1',
        platform: {
          osName: 'linux',
          osVersion: 'Debian - 10.5',
          browserName: 'chrome',
          browserVersion: '6.4.7',
        },
      };
    });

    it('POST /runs/:id/instances + returns CreateInstanceResponse', async () => {
      const result: CreateInstanceResponse = {
        spec: null,
        instanceId: null,
        claimedInstances: 10,
        totalInstances: 10,
      };

      nock(getAPIBaseUrl()).post('/runs/1/instances', _.matches(payload)).reply(200, result);

      const run = await createInstance(payload);
      expect(run).toStrictEqual(result);
    });
  });

  describe('setInstanceTests', () => {
    let payload: SetInstanceTestsPayload;

    beforeEach(() => {
      payload = {
        config: {
          video: false,
          videoUploadOnPasses: false,
        },
        tests: [],
        hooks: [],
      };
    });

    it('POST /instances/:id/tests', async () => {
      const result = {};

      nock(getAPIBaseUrl()).post('/instances/1/tests', _.matches(payload)).reply(200, result);

      const run = await setInstanceTests('1', payload);
      expect(run).toStrictEqual(result);
    });
  });

  describe('updateInstanceResults', () => {
    let payload: UpdateInstanceResultsPayload;

    beforeEach(() => {
      payload = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 1,
          pending: 1,
          skipped: 0,
          failures: 0,
          wallClockStartedAt: '2022-12-11T08:46:31.881Z',
          wallClockEndedAt: '2022-12-11T08:46:50.519Z',
          wallClockDuration: 18638,
        },
        tests: [
          {
            clientId: 'r3',
            state: TestState.Pending,
            displayError: null,
            attempts: [
              {
                state: TestState.Pending,
                error: null,
                wallClockStartedAt: null,
                wallClockDuration: null,
                videoTimestamp: null,
              },
            ],
          },
          {
            clientId: 'r4',
            state: TestState.Passed,
            displayError: null,
            attempts: [
              {
                state: TestState.Passed,
                error: null,
                wallClockStartedAt: '2022-12-11T08:46:31.893Z',
                wallClockDuration: 18625,
                videoTimestamp: 1172,
              },
            ],
          },
        ],
        exception: null,
        video: false,
        screenshots: [],
        reporterStats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 1,
          failures: 0,
          start: '2022-12-11T08:46:31.884Z',
          end: '2022-12-11T08:46:50.535Z',
          duration: 18651,
        },
      };
    });

    it('POST /instances/:id/results + returning UpdateInstanceResultsResponse', async () => {
      const result: UpdateInstanceResultsResponse = {
        screenshotUploadUrls: [],
        videoUploadUrl: null,
      };

      nock(getAPIBaseUrl()).post('/instances/1/results', _.matches(payload)).reply(200, result);

      const run = await updateInstanceResults('1', payload);
      expect(run).toStrictEqual(result);
    });
  });

  describe('updateInstanceStdout', () => {
    const payload = 'string';

    it('PUT /instances/:id/stdout', async () => {
      nock(getAPIBaseUrl()).put('/instances/1/stdout', { stdout: payload }).reply(200);

      const run = await updateInstanceStdout('1', payload);
      expect(run).toMatchObject({ status: 200 });
    });
  });

  afterAll(() => {
    nock.restore();
  });
});
