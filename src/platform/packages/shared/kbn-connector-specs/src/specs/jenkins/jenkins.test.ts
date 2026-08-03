/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { generateSecretsSchemaFromSpec } from '../../lib/generate_secrets_schema_from_spec';
import { Jenkins } from './jenkins';

const BASE_URL = 'https://jenkins.example.com';

interface TestResult {
  message?: string;
}

describe('Jenkins connector', () => {
  const mockRequest = jest.fn();
  const mockClient = { request: mockRequest };

  const mockContext = {
    client: mockClient,
    config: { baseUrl: BASE_URL },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const okResponse = (data: unknown, headers: Record<string, string> = {}) => ({
    data,
    headers,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id and display name', () => {
      expect(Jenkins.metadata.id).toBe('.jenkins');
      expect(Jenkins.metadata.displayName).toBe('Jenkins');
    });

    it('supports workflows and agentBuilder features', () => {
      expect(Jenkins.metadata.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    });

    it('is marked as technical preview', () => {
      expect(Jenkins.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('recommends the basic auth type', () => {
      const auth = Jenkins.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'basic'
      );
      expect(auth).toBeDefined();
      expect(auth?.isRecommended).toBe(true);
      expect(auth?.overrides?.meta?.password).toMatchObject({ label: 'API token' });
    });

    it('validates secrets with a required username and password', () => {
      const schema = generateSecretsSchemaFromSpec(Jenkins.auth, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });

      expect(
        schema.safeParse({ authType: 'basic', username: 'admin', password: 'token123' }).success
      ).toBe(true);
      expect(schema.safeParse({ authType: 'basic', username: 'admin', password: '' }).success).toBe(
        false
      );
    });
  });

  describe('request action', () => {
    it('issues a request to the given path with query and body', async () => {
      mockRequest.mockResolvedValue(okResponse({ jobs: [] }));

      const result = await Jenkins.actions.request.handler(mockContext, {
        method: 'GET',
        path: '/api/json',
        query: { tree: 'jobs[name]' },
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `${BASE_URL}/api/json`,
        params: { tree: 'jobs[name]' },
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
      expect(result).toEqual({ jobs: [] });
    });

    it('strips a trailing slash from baseUrl', async () => {
      mockRequest.mockResolvedValue(okResponse({}));
      const ctx = {
        ...mockContext,
        config: { baseUrl: `${BASE_URL}/` },
      } as unknown as ActionContext;

      await Jenkins.actions.request.handler(ctx, { method: 'GET', path: '/api/json' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/api/json` })
      );
    });

    it('rejects paths that do not start with /', async () => {
      await expect(
        Jenkins.actions.request.handler(mockContext, { method: 'GET', path: 'api/json' })
      ).rejects.toThrow('must start with "/"');
    });

    it('rejects the Groovy script console', async () => {
      await expect(
        Jenkins.actions.request.handler(mockContext, { method: 'POST', path: '/scriptText' })
      ).rejects.toThrow('not permitted');
    });

    it('rejects the credentials store', async () => {
      await expect(
        Jenkins.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/credentials/store/system/domain/_/',
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects the plugin manager and instance restart endpoints', async () => {
      await expect(
        Jenkins.actions.request.handler(mockContext, {
          method: 'POST',
          path: '/pluginManager/installNecessaryPlugins',
        })
      ).rejects.toThrow('not permitted');

      await expect(
        Jenkins.actions.request.handler(mockContext, { method: 'POST', path: '/safeRestart' })
      ).rejects.toThrow('not permitted');
    });

    it('rejects percent-encoded paths that would decode to a blocked prefix', async () => {
      await expect(
        Jenkins.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/%73cript',
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects dot-segment traversal that would resolve to a blocked prefix', async () => {
      await expect(
        Jenkins.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/job/foo/../../script',
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects paths with invalid percent-encoding', async () => {
      await expect(
        Jenkins.actions.request.handler(mockContext, { method: 'GET', path: '/job/%' })
      ).rejects.toThrow('invalid percent-encoding');
    });
  });

  describe('triggerBuild', () => {
    it('parses the queue item id from the Location header', async () => {
      mockRequest.mockResolvedValue(
        okResponse(undefined, { location: `${BASE_URL}/queue/item/42/` })
      );

      const result = await Jenkins.actions.triggerBuild.handler(mockContext, {
        jobName: 'my-job',
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${BASE_URL}/job/my-job/build`,
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
      expect(result).toEqual({ queueId: 42, queueUrl: `${BASE_URL}/queue/item/42/` });
    });

    it('encodes the job name in the URL path', async () => {
      mockRequest.mockResolvedValue(okResponse(undefined, { location: '/queue/item/1/' }));

      await Jenkins.actions.triggerBuild.handler(mockContext, { jobName: 'a/b' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/job/a%2Fb/build` })
      );
    });

    it('throws when no Location header is returned', async () => {
      mockRequest.mockResolvedValue(okResponse(undefined, {}));

      await expect(
        Jenkins.actions.triggerBuild.handler(mockContext, { jobName: 'my-job' })
      ).rejects.toThrow('did not return a queue item Location header');
    });
  });

  describe('triggerBuildWithParameters', () => {
    it('sends parameters as a form-urlencoded body', async () => {
      mockRequest.mockResolvedValue(
        okResponse(undefined, { location: `${BASE_URL}/queue/item/7/` })
      );

      const result = await Jenkins.actions.triggerBuildWithParameters.handler(mockContext, {
        jobName: 'deploy',
        parameters: { ENVIRONMENT: 'staging', DRY_RUN: 'true' },
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${BASE_URL}/job/deploy/buildWithParameters`,
        data: 'ENVIRONMENT=staging&DRY_RUN=true',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
      expect(result).toEqual({ queueId: 7, queueUrl: `${BASE_URL}/queue/item/7/` });
    });
  });

  describe('getQueueItem', () => {
    it('returns a build reference once the queue item has started', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          id: 42,
          blocked: false,
          buildable: false,
          stuck: false,
          cancelled: false,
          why: null,
          task: { name: 'my-job', url: `${BASE_URL}/job/my-job/` },
          executable: { number: 17, url: `${BASE_URL}/job/my-job/17/` },
        })
      );

      const result = await Jenkins.actions.getQueueItem.handler(mockContext, { queueId: 42 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/queue/item/42/api/json` })
      );
      expect(result).toEqual({
        id: 42,
        blocked: false,
        buildable: false,
        stuck: false,
        cancelled: false,
        why: null,
        task: { name: 'my-job', url: `${BASE_URL}/job/my-job/` },
        build: { number: 17, url: `${BASE_URL}/job/my-job/17/` },
      });
    });

    it('omits build while still blocked', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          id: 5,
          blocked: true,
          buildable: false,
          why: 'Waiting for next available executor',
          task: { name: 'my-job' },
          executable: null,
        })
      );

      const result = (await Jenkins.actions.getQueueItem.handler(mockContext, {
        queueId: 5,
      })) as Record<string, unknown>;

      expect(result.blocked).toBe(true);
      expect(result).not.toHaveProperty('build');
    });
  });

  describe('getBuild / getLastBuild', () => {
    const buildData = {
      number: 17,
      url: `${BASE_URL}/job/my-job/17/`,
      displayName: '#17',
      building: false,
      result: 'SUCCESS',
      timestamp: 1700000000000,
      duration: 12345,
      estimatedDuration: 10000,
    };

    it('getBuild returns a slim build with an ISO timestamp', async () => {
      mockRequest.mockResolvedValue(okResponse(buildData));

      const result = await Jenkins.actions.getBuild.handler(mockContext, {
        jobName: 'my-job',
        buildNumber: 17,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/job/my-job/17/api/json` })
      );
      expect(result).toEqual({
        number: 17,
        url: `${BASE_URL}/job/my-job/17/`,
        displayName: '#17',
        building: false,
        result: 'SUCCESS',
        timestamp: new Date(1700000000000).toISOString(),
        durationMs: 12345,
        estimatedDurationMs: 10000,
      });
    });

    it('getLastBuild targets the lastBuild alias', async () => {
      mockRequest.mockResolvedValue(okResponse({ ...buildData, result: null, building: true }));

      const result = (await Jenkins.actions.getLastBuild.handler(mockContext, {
        jobName: 'my-job',
      })) as Record<string, unknown>;

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/job/my-job/lastBuild/api/json` })
      );
      expect(result.building).toBe(true);
      expect(result.result).toBeNull();
    });
  });

  describe('getConsoleLog', () => {
    it('returns console output untouched when under the cap', async () => {
      mockRequest.mockResolvedValue(okResponse('build succeeded\n'));

      const result = await Jenkins.actions.getConsoleLog.handler(mockContext, {
        jobName: 'my-job',
        buildNumber: 17,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${BASE_URL}/job/my-job/17/consoleText`,
          responseType: 'text',
        })
      );
      expect(result).toEqual({ content: 'build succeeded\n', truncated: false });
    });

    it('truncates oversized console output to the tail', async () => {
      const big = 'x'.repeat(25000);
      mockRequest.mockResolvedValue(okResponse(big));

      const result = await Jenkins.actions.getConsoleLog.handler(mockContext, {
        jobName: 'my-job',
        buildNumber: 17,
      });

      expect(result).toEqual({ content: big.slice(big.length - 20000), truncated: true });
    });
  });

  describe('stopBuild', () => {
    it('posts to the stop endpoint', async () => {
      mockRequest.mockResolvedValue(okResponse(undefined));

      const result = (await Jenkins.actions.stopBuild.handler(mockContext, {
        jobName: 'my-job',
        buildNumber: 17,
      })) as TestResult;

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${BASE_URL}/job/my-job/17/stop`,
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
      expect(result.message).toContain('my-job');
      expect(result.message).toContain('17');
    });

    it('does not follow the 302 Jenkins returns on success, to avoid dropping Basic-Auth credentials', async () => {
      // Jenkins responds to /stop (and disable/enable/quietDown/cancelQuietDown) with a 302
      // to the resulting page. axios attaches Basic-Auth via the `auth` request option rather
      // than a header, and follow-redirects clears that option with the redirect target's
      // (credential-less) URL fields, so auto-following would silently drop credentials on the
      // next hop. Assert the validateStatus passed to the client actually accepts a bare 302.
      mockRequest.mockResolvedValue(okResponse(undefined));

      await Jenkins.actions.stopBuild.handler(mockContext, { jobName: 'my-job', buildNumber: 17 });

      const { validateStatus } = mockRequest.mock.calls[0][0] as {
        validateStatus: (status: number) => boolean;
      };
      expect(validateStatus(302)).toBe(true);
      expect(validateStatus(200)).toBe(true);
      expect(validateStatus(404)).toBe(false);
    });
  });

  describe('listJobs', () => {
    it('maps job color to a friendly status and building flag', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          jobs: [
            { name: 'stable', url: `${BASE_URL}/job/stable/`, color: 'blue', buildable: true },
            {
              name: 'building',
              url: `${BASE_URL}/job/building/`,
              color: 'blue_anime',
              buildable: true,
            },
            { name: 'broken', url: `${BASE_URL}/job/broken/`, color: 'red', buildable: true },
            {
              name: 'off',
              url: `${BASE_URL}/job/off/`,
              color: 'disabled',
              buildable: false,
            },
          ],
        })
      );

      const result = (await Jenkins.actions.listJobs.handler(mockContext, {})) as {
        jobCount: number;
        jobs: Array<{ name: string; status: string; building: boolean }>;
      };

      expect(result.jobCount).toBe(4);
      expect(result.jobs[0]).toMatchObject({ name: 'stable', status: 'success', building: false });
      expect(result.jobs[1]).toMatchObject({
        name: 'building',
        status: 'success',
        building: true,
      });
      expect(result.jobs[2]).toMatchObject({ name: 'broken', status: 'failed' });
      expect(result.jobs[3]).toMatchObject({ name: 'off', status: 'disabled' });
    });
  });

  describe('getJob', () => {
    it('extracts parameter definitions and build pointers', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          name: 'deploy',
          url: `${BASE_URL}/job/deploy/`,
          color: 'blue',
          buildable: true,
          description: 'Deploys the app',
          lastSuccessfulBuild: { number: 10, url: `${BASE_URL}/job/deploy/10/` },
          lastFailedBuild: { number: 9, url: `${BASE_URL}/job/deploy/9/` },
          property: [
            {
              parameterDefinitions: [
                {
                  name: 'ENVIRONMENT',
                  type: 'StringParameterDefinition',
                  description: 'Target environment',
                  defaultParameterValue: { value: 'staging' },
                },
              ],
            },
          ],
        })
      );

      const result = (await Jenkins.actions.getJob.handler(mockContext, {
        jobName: 'deploy',
      })) as {
        parameters: Array<Record<string, unknown>>;
        lastSuccessfulBuild: Record<string, unknown>;
        lastFailedBuild: Record<string, unknown>;
      };

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/job/deploy/api/json` })
      );
      expect(result.parameters).toEqual([
        {
          name: 'ENVIRONMENT',
          type: 'StringParameterDefinition',
          description: 'Target environment',
          defaultValue: 'staging',
        },
      ]);
      expect(result.lastSuccessfulBuild).toEqual({ number: 10, url: `${BASE_URL}/job/deploy/10/` });
      expect(result.lastFailedBuild).toEqual({ number: 9, url: `${BASE_URL}/job/deploy/9/` });
    });

    it('omits parameters when the job has none', async () => {
      mockRequest.mockResolvedValue(
        okResponse({ name: 'simple', color: 'blue', buildable: true, property: [] })
      );

      const result = (await Jenkins.actions.getJob.handler(mockContext, {
        jobName: 'simple',
      })) as Record<string, unknown>;

      expect(result).not.toHaveProperty('parameters');
    });
  });

  describe('listBuilds', () => {
    it('requests a bounded range and defaults the limit', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          builds: [
            { number: 2, url: 'b2', timestamp: 2000, result: 'SUCCESS', duration: 100 },
            { number: 1, url: 'b1', timestamp: 1000, result: 'FAILURE', duration: 200 },
          ],
        })
      );

      const result = (await Jenkins.actions.listBuilds.handler(mockContext, {
        jobName: 'my-job',
      })) as { buildCount: number };

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { tree: 'builds[number,url,timestamp,result,duration]{0,20}' },
        })
      );
      expect(result.buildCount).toBe(2);
    });

    it('honors a custom limit', async () => {
      mockRequest.mockResolvedValue(okResponse({ builds: [] }));

      await Jenkins.actions.listBuilds.handler(mockContext, { jobName: 'my-job', limit: 5 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { tree: 'builds[number,url,timestamp,result,duration]{0,5}' },
        })
      );
    });
  });

  describe('getBuildTestReport', () => {
    it('returns counts and capped failing tests', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          failCount: 1,
          passCount: 9,
          skipCount: 1,
          duration: 12.5,
          suites: [
            {
              name: 'unit',
              cases: [
                { className: 'FooTest', name: 'works', status: 'PASSED' },
                {
                  className: 'FooTest',
                  name: 'broken',
                  status: 'FAILED',
                  errorDetails: 'expected true but was false',
                },
              ],
            },
          ],
        })
      );

      const result = await Jenkins.actions.getBuildTestReport.handler(mockContext, {
        jobName: 'my-job',
        buildNumber: 17,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${BASE_URL}/job/my-job/17/testReport/api/json`,
        })
      );
      expect(result).toEqual({
        passCount: 9,
        failCount: 1,
        skipCount: 1,
        durationSec: 12.5,
        failingTests: [
          {
            suite: 'unit',
            className: 'FooTest',
            name: 'broken',
            status: 'FAILED',
            errorDetails: 'expected true but was false',
          },
        ],
        failingTestsTruncated: false,
      });
    });

    it('caps failing tests at 50 and marks the result truncated', async () => {
      const cases = Array.from({ length: 60 }, (_, i) => ({
        className: 'FooTest',
        name: `case${i}`,
        status: 'FAILED',
      }));
      mockRequest.mockResolvedValue(
        okResponse({ failCount: 60, passCount: 0, skipCount: 0, suites: [{ cases }] })
      );

      const result = (await Jenkins.actions.getBuildTestReport.handler(mockContext, {
        jobName: 'my-job',
        buildNumber: 17,
      })) as { failingTests: unknown[]; failingTestsTruncated: boolean };

      expect(result.failingTests).toHaveLength(50);
      expect(result.failingTestsTruncated).toBe(true);
    });
  });

  describe('disableJob / enableJob', () => {
    it('disableJob posts to the disable endpoint', async () => {
      mockRequest.mockResolvedValue(okResponse(undefined));

      await Jenkins.actions.disableJob.handler(mockContext, { jobName: 'my-job' });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${BASE_URL}/job/my-job/disable`,
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
    });

    it('enableJob posts to the enable endpoint', async () => {
      mockRequest.mockResolvedValue(okResponse(undefined));

      await Jenkins.actions.enableJob.handler(mockContext, { jobName: 'my-job' });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${BASE_URL}/job/my-job/enable`,
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
    });
  });

  describe('getQueue', () => {
    it('returns slim queue items', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          items: [
            {
              id: 1,
              blocked: true,
              buildable: false,
              why: 'waiting',
              task: { name: 'my-job' },
            },
          ],
        })
      );

      const result = (await Jenkins.actions.getQueue.handler(mockContext, {})) as {
        itemCount: number;
      };

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/queue/api/json` })
      );
      expect(result.itemCount).toBe(1);
    });
  });

  describe('quietDown / cancelQuietDown', () => {
    it('quietDown posts with no body', async () => {
      mockRequest.mockResolvedValue(okResponse(undefined));

      await Jenkins.actions.quietDown.handler(mockContext, {});

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${BASE_URL}/quietDown`,
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
    });

    it('cancelQuietDown posts with no body', async () => {
      mockRequest.mockResolvedValue(okResponse(undefined));

      await Jenkins.actions.cancelQuietDown.handler(mockContext, {});

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${BASE_URL}/cancelQuietDown`,
        maxRedirects: 0,
        validateStatus: expect.any(Function),
      });
    });
  });

  describe('error normalization', () => {
    it('strips HTML from an error body and surfaces the status', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 404,
          data: '<html><body><h1>Error 404</h1><p>No such job</p></body></html>',
        },
      });

      await expect(
        Jenkins.actions.getBuild.handler(mockContext, { jobName: 'missing', buildNumber: 1 })
      ).rejects.toThrow('Jenkins API error (404): Error 404 No such job');
    });

    it('falls back to the x-error header when the body has no message', async () => {
      mockRequest.mockRejectedValue({
        response: { status: 403, data: '', headers: { 'x-error': 'No valid crumb' } },
      });

      await expect(
        Jenkins.actions.stopBuild.handler(mockContext, { jobName: 'my-job', buildNumber: 1 })
      ).rejects.toThrow('Jenkins API error (403): No valid crumb');
    });
  });

  describe('test handler', () => {
    it('reports the connected username', async () => {
      mockRequest.mockResolvedValue(
        okResponse({ name: 'admin', authenticated: true, anonymous: false })
      );

      const result = (await Jenkins.test?.handler(mockContext)) as TestResult;
      expect(result.message).toBe('Successfully connected to Jenkins as "admin"');
    });

    it('throws when the request is anonymous', async () => {
      mockRequest.mockResolvedValue(
        okResponse({ name: 'anonymous', authenticated: false, anonymous: true })
      );

      await expect(Jenkins.test?.handler(mockContext)).rejects.toThrow(
        'did not recognize the provided username and API token'
      );
    });
  });
});
