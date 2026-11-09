/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Buildkite } from './buildkite';

const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

const parse = <K extends keyof typeof Buildkite.actions>(action: K, raw: Record<string, unknown>) =>
  Buildkite.actions[action].input.parse(raw);

const jsonContent = (data: unknown) => [{ type: 'text', text: JSON.stringify(data) }];

describe('Buildkite', () => {
  const mockContext = {
    client: {},
    log: {},
    config: { serverUrl: 'https://mcp.buildkite.com/direct', orgSlug: 'my-org' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ content: jsonContent({ ok: true }) });
    mockListTools.mockResolvedValue({
      tools: [{ name: 'list_pipelines' }, { name: 'create_build' }],
    });
  });

  it('is defined', () => {
    expect(Buildkite).toBeDefined();
  });

  describe('createBuild action', () => {
    it('sends the commit, branch, and optional fields with org_slug injected', async () => {
      const input = parse('createBuild', {
        pipelineSlug: 'my-pipeline',
        commit: 'HEAD',
        branch: 'main',
        message: 'Deploy',
        ignoreBranchFilters: true,
        environment: { DEPLOY_ENV: 'staging' },
        metadata: { triggered_by: 'workflow' },
      });
      await Buildkite.actions.createBuild.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_build',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          commit: 'HEAD',
          branch: 'main',
          message: 'Deploy',
          ignore_branch_filters: true,
          environment: [{ key: 'DEPLOY_ENV', value: 'staging' }],
          metadata: [{ key: 'triggered_by', value: 'workflow' }],
        },
      });
    });

    it('omits environment and metadata when not provided', async () => {
      const input = parse('createBuild', {
        pipelineSlug: 'my-pipeline',
        commit: 'HEAD',
        branch: 'main',
      });
      await Buildkite.actions.createBuild.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_build',
        arguments: expect.objectContaining({
          environment: undefined,
          metadata: undefined,
        }),
      });
    });

    it('throws when orgSlug is not configured', async () => {
      const input = parse('createBuild', {
        pipelineSlug: 'my-pipeline',
        commit: 'HEAD',
        branch: 'main',
      });
      const contextWithoutOrg = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(Buildkite.actions.createBuild.handler(contextWithoutOrg, input)).rejects.toThrow(
        'orgSlug'
      );
    });
  });

  describe('getBuild action', () => {
    it('stringifies the build number', async () => {
      const input = parse('getBuild', { pipelineSlug: 'my-pipeline', buildNumber: 42 });
      await Buildkite.actions.getBuild.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_build',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
        },
      });
    });
  });

  describe('listBuilds action', () => {
    it('passes filters through with snake_case keys', async () => {
      const input = parse('listBuilds', {
        pipelineSlug: 'my-pipeline',
        branch: 'main',
        state: 'failed',
        commit: 'abc123',
        creator: 'jane@example.com',
        page: 2,
        perPage: 50,
      });
      await Buildkite.actions.listBuilds.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_builds',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          branch: 'main',
          state: 'failed',
          commit: 'abc123',
          creator: 'jane@example.com',
          page: 2,
          per_page: 50,
        },
      });
    });

    it('lists across the whole organization when pipelineSlug is omitted', async () => {
      const input = parse('listBuilds', {});
      await Buildkite.actions.listBuilds.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_builds',
        arguments: expect.objectContaining({ org_slug: 'my-org', pipeline_slug: undefined }),
      });
    });
  });

  describe('cancelBuild action', () => {
    it('cancels the build by pipeline slug and build number', async () => {
      const input = parse('cancelBuild', { pipelineSlug: 'my-pipeline', buildNumber: '42' });
      await Buildkite.actions.cancelBuild.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'cancel_build',
        arguments: { org_slug: 'my-org', pipeline_slug: 'my-pipeline', build_number: '42' },
      });
    });
  });

  describe('rebuild action', () => {
    it('rebuilds by pipeline slug and build number', async () => {
      const input = parse('rebuild', { pipelineSlug: 'my-pipeline', buildNumber: '42' });
      await Buildkite.actions.rebuild.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'rebuild_build',
        arguments: { org_slug: 'my-org', pipeline_slug: 'my-pipeline', build_number: '42' },
      });
    });
  });

  describe('retryFailedJobs action', () => {
    it('lists failed/broken/timed-out jobs and retries each one', async () => {
      mockCallTool.mockImplementation(async ({ name }: { name: string }) => {
        if (name === 'list_jobs') {
          return {
            content: jsonContent({
              items: [
                { id: 'job-1', name: 'test' },
                { id: 'job-2', name: 'lint' },
              ],
            }),
          };
        }
        return { content: jsonContent({ id: name === 'retry_job' ? 'retried' : 'unknown' }) };
      });

      const input = parse('retryFailedJobs', { pipelineSlug: 'my-pipeline', buildNumber: '42' });
      const result = await Buildkite.actions.retryFailedJobs.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenNthCalledWith(1, {
        name: 'list_jobs',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          state: 'failed,broken,timed_out',
        },
      });
      expect(mockCallTool).toHaveBeenNthCalledWith(2, {
        name: 'retry_job',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          job_id: 'job-1',
        },
      });
      expect(mockCallTool).toHaveBeenNthCalledWith(3, {
        name: 'retry_job',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          job_id: 'job-2',
        },
      });
      expect(result).toEqual({
        retriedCount: 2,
        jobs: [
          { jobId: 'job-1', name: 'test', status: 'retried' },
          { jobId: 'job-2', name: 'lint', status: 'retried' },
        ],
      });
    });

    it('records per-job errors without failing the whole action', async () => {
      mockCallTool.mockImplementation(
        async ({ name, arguments: args }: { name: string; arguments: Record<string, unknown> }) => {
          if (name === 'list_jobs') {
            return { content: jsonContent({ items: [{ id: 'job-1' }, { id: 'job-2' }] }) };
          }
          if (args.job_id === 'job-2') {
            throw new Error('job not retryable');
          }
          return { content: jsonContent({}) };
        }
      );

      const input = parse('retryFailedJobs', { pipelineSlug: 'my-pipeline', buildNumber: '42' });
      const result = await Buildkite.actions.retryFailedJobs.handler(mockContext, input);

      expect(result).toEqual({
        retriedCount: 1,
        jobs: [
          { jobId: 'job-1', name: undefined, status: 'retried' },
          { jobId: 'job-2', name: undefined, status: 'error', error: 'job not retryable' },
        ],
      });
    });

    it('returns an empty result when there are no matching jobs', async () => {
      mockCallTool.mockResolvedValue({ content: jsonContent({ items: [] }) });

      const input = parse('retryFailedJobs', { pipelineSlug: 'my-pipeline', buildNumber: '42' });
      const result = await Buildkite.actions.retryFailedJobs.handler(mockContext, input);

      expect(result).toEqual({ retriedCount: 0, jobs: [] });
      expect(mockCallTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('listJobs action', () => {
    it('passes the state filter through', async () => {
      const input = parse('listJobs', {
        pipelineSlug: 'my-pipeline',
        buildNumber: '42',
        state: 'failed,broken',
      });
      await Buildkite.actions.listJobs.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_jobs',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          state: 'failed,broken',
          per_page: undefined,
        },
      });
    });
  });

  describe('unblockJob action', () => {
    it('passes block-step field values through', async () => {
      const input = parse('unblockJob', {
        pipelineSlug: 'my-pipeline',
        buildNumber: '42',
        jobId: 'job-1',
        fields: { release_notes: 'v1.2.3' },
      });
      await Buildkite.actions.unblockJob.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'unblock_job',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          job_id: 'job-1',
          fields: { release_notes: 'v1.2.3' },
        },
      });
    });
  });

  describe('retryJob action', () => {
    it('retries a single job by id', async () => {
      const input = parse('retryJob', {
        pipelineSlug: 'my-pipeline',
        buildNumber: '42',
        jobId: 'job-1',
      });
      await Buildkite.actions.retryJob.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'retry_job',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          job_id: 'job-1',
        },
      });
    });
  });

  describe('getJobLog action', () => {
    it('applies the default limit when not provided', async () => {
      const input = parse('getJobLog', {
        pipelineSlug: 'my-pipeline',
        buildNumber: '42',
        jobId: 'job-1',
      });
      await Buildkite.actions.getJobLog.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'read_logs',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          job_id: 'job-1',
          seek: undefined,
          limit: 500,
        },
      });
    });

    it('passes a custom seek and limit through', async () => {
      const input = parse('getJobLog', {
        pipelineSlug: 'my-pipeline',
        buildNumber: '42',
        jobId: 'job-1',
        seek: 1000,
        limit: 100,
      });
      await Buildkite.actions.getJobLog.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'read_logs',
        arguments: expect.objectContaining({ seek: 1000, limit: 100 }),
      });
    });
  });

  describe('createBuildAnnotation action', () => {
    it('sends the annotation body and style', async () => {
      const input = parse('createBuildAnnotation', {
        pipelineSlug: 'my-pipeline',
        buildNumber: '42',
        body: '### Deploy failed',
        style: 'error',
        context: 'deploy-status',
        append: true,
      });
      await Buildkite.actions.createBuildAnnotation.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_annotation',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          body: '### Deploy failed',
          style: 'error',
          context: 'deploy-status',
          priority: undefined,
          append: true,
        },
      });
    });
  });

  describe('listBuildAnnotations action', () => {
    it('lists annotations for a build', async () => {
      const input = parse('listBuildAnnotations', {
        pipelineSlug: 'my-pipeline',
        buildNumber: '42',
      });
      await Buildkite.actions.listBuildAnnotations.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_annotations',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          page: undefined,
          per_page: undefined,
        },
      });
    });
  });

  describe('listPipelines action', () => {
    it('passes filters through', async () => {
      const input = parse('listPipelines', { name: 'deploy' });
      await Buildkite.actions.listPipelines.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_pipelines',
        arguments: {
          org_slug: 'my-org',
          name: 'deploy',
          repository: undefined,
          page: undefined,
          per_page: undefined,
        },
      });
    });
  });

  describe('getPipeline action', () => {
    it('gets a pipeline by slug', async () => {
      const input = parse('getPipeline', { pipelineSlug: 'my-pipeline' });
      await Buildkite.actions.getPipeline.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_pipeline',
        arguments: { org_slug: 'my-org', pipeline_slug: 'my-pipeline' },
      });
    });
  });

  describe('listArtifacts action', () => {
    it('lists artifacts for a build', async () => {
      const input = parse('listArtifacts', { pipelineSlug: 'my-pipeline', buildNumber: '42' });
      await Buildkite.actions.listArtifacts.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_artifacts_for_build',
        arguments: {
          org_slug: 'my-org',
          pipeline_slug: 'my-pipeline',
          build_number: '42',
          page: undefined,
          per_page: undefined,
        },
      });
    });
  });

  describe('listTools action', () => {
    it('returns the list of available tools', async () => {
      const result = await Buildkite.actions.listTools.handler(mockContext, {});

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual([{ name: 'list_pipelines' }, { name: 'create_build' }]);
    });
  });

  describe('callTool action', () => {
    it('calls the named tool with org_slug injected into the arguments', async () => {
      const result = await Buildkite.actions.callTool.handler(mockContext, {
        name: 'list_clusters',
        arguments: { per_page: 5 },
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_clusters',
        arguments: { org_slug: 'my-org', per_page: 5 },
      });
      expect(result).toEqual(jsonContent({ ok: true }));
    });

    it('allows overriding org_slug explicitly', async () => {
      await Buildkite.actions.callTool.handler(mockContext, {
        name: 'list_clusters',
        arguments: { org_slug: 'other-org' },
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_clusters',
        arguments: { org_slug: 'other-org' },
      });
    });

    it('calls the named tool with just org_slug when no arguments are given', async () => {
      await Buildkite.actions.callTool.handler(mockContext, { name: 'list_clusters' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_clusters',
        arguments: { org_slug: 'my-org' },
      });
    });

    it('does not inject org_slug for tools whose schema does not accept it', async () => {
      mockListTools.mockResolvedValue({
        tools: [{ name: 'access_token', inputSchema: { type: 'object', properties: {} } }],
      });

      await Buildkite.actions.callTool.handler(mockContext, { name: 'access_token' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'access_token',
        arguments: {},
      });
    });

    it('injects org_slug for tools whose schema declares it', async () => {
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: 'list_clusters',
            inputSchema: { type: 'object', properties: { org_slug: { type: 'string' } } },
          },
        ],
      });

      await Buildkite.actions.callTool.handler(mockContext, {
        name: 'list_clusters',
        arguments: { per_page: 5 },
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_clusters',
        arguments: { org_slug: 'my-org', per_page: 5 },
      });
    });
  });

  describe('test handler', () => {
    it('reports success when pipelines are visible', async () => {
      mockCallTool.mockResolvedValue({
        content: jsonContent({ items: [{ slug: 'my-pipeline' }] }),
      });

      const result = await Buildkite.test.handler(mockContext);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_pipelines',
        arguments: { org_slug: 'my-org', per_page: 1 },
      });
      expect(result).toEqual({
        message: 'Connected to Buildkite organization "my-org".',
      });
    });

    it('reports success with a warning when no pipelines are visible', async () => {
      mockCallTool.mockResolvedValue({ content: jsonContent({ items: [] }) });

      const result = await Buildkite.test.handler(mockContext);

      expect(result).toEqual({
        message:
          'Connected to Buildkite organization "my-org", but no pipelines were found. Verify the organization slug and that the token can see pipelines.',
      });
    });

    it('propagates errors thrown by withMcpClient', async () => {
      const { withMcpClient } = jest.requireMock('../../lib/mcp/with_mcp_client');
      withMcpClient.mockRejectedValueOnce(new Error('connection refused'));

      await expect(Buildkite.test.handler(mockContext)).rejects.toThrow('connection refused');
    });
  });
});
