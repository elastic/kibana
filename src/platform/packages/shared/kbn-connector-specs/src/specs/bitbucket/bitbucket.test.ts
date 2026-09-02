/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { Bitbucket } from './bitbucket';

const REPO_URL = 'https://api.bitbucket.org/2.0/repositories/my-workspace/my-repo';

const parse = <K extends keyof typeof Bitbucket.actions>(action: K, raw: Record<string, unknown>) =>
  Bitbucket.actions[action].input.parse(raw);

const samplePullRequest = {
  id: 7,
  title: 'Fix config drift',
  description: 'Automated remediation',
  state: 'OPEN',
  draft: false,
  author: { display_name: 'Bot', uuid: '{bot-uuid}', nickname: 'bot', account_id: '557058:1' },
  source: {
    branch: { name: 'fix/config-drift' },
    commit: { hash: 'abc123' },
    repository: { full_name: 'my-workspace/my-repo' },
  },
  destination: { branch: { name: 'main' }, commit: { hash: 'def456' } },
  reviewers: [{ display_name: 'Reviewer', uuid: '{rev-uuid}' }],
  participants: [
    { user: { display_name: 'Reviewer', uuid: '{rev-uuid}' }, role: 'REVIEWER', approved: true },
    { user: { display_name: 'Other', uuid: '{other-uuid}' }, role: 'PARTICIPANT', approved: false },
  ],
  merge_commit: null,
  close_source_branch: true,
  comment_count: 2,
  task_count: 0,
  created_on: '2026-01-01T00:00:00Z',
  updated_on: '2026-01-02T00:00:00Z',
  links: { html: { href: 'https://bitbucket.org/my-workspace/my-repo/pull-requests/7' } },
};

describe('Bitbucket', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { workspace: 'my-workspace' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is defined and wired into all_specs', () => {
    expect(Bitbucket).toBeDefined();
    expect(getConnectorSpec('.bitbucket')).toBe(Bitbucket);
  });

  it('has the expected metadata', () => {
    expect(Bitbucket.metadata.id).toBe('.bitbucket');
    expect(Bitbucket.metadata.displayName).toBe('Bitbucket');
    expect(Bitbucket.metadata.minimumLicense).toBe('enterprise');
    expect(Bitbucket.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
  });

  it('supports basic and bearer auth', () => {
    const types = (Bitbucket.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toEqual(['basic', 'bearer']);
  });

  it('marks every tool action with an explicit scope', () => {
    for (const [name, action] of Object.entries(Bitbucket.actions)) {
      expect(action.isTool).toBe(true);
      expect(['read', 'write', 'destroy']).toContain(action.scope);
      expect(action.description).toBeTruthy();
      expect(name).toBeTruthy();
    }
  });

  it('throws a clear error when workspace is not configured', async () => {
    const ctx = { ...mockContext, config: {} } as unknown as ActionContext;
    await expect(
      Bitbucket.actions.getBranch.handler(ctx, parse('getBranch', { repoSlug: 'r', name: 'main' }))
    ).rejects.toThrow('workspace');
  });

  it('wraps Bitbucket API errors with status and message', async () => {
    mockClient.get.mockRejectedValue({
      message: 'Request failed with status code 404',
      response: {
        status: 404,
        data: { error: { message: 'Not found', detail: 'No such branch' } },
      },
    });
    await expect(
      Bitbucket.actions.getBranch.handler(
        mockContext,
        parse('getBranch', { repoSlug: 'my-repo', name: 'nope' })
      )
    ).rejects.toThrow('Bitbucket getBranch failed (status 404): Not found - No such branch');
  });

  describe('listRepositories', () => {
    it('lists repositories in the configured workspace with filters', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          values: [
            {
              slug: 'my-repo',
              name: 'My Repo',
              full_name: 'my-workspace/my-repo',
              is_private: true,
              mainbranch: { name: 'main' },
              project: { key: 'PROJ' },
              links: { html: { href: 'https://bitbucket.org/my-workspace/my-repo' } },
            },
          ],
          page: 1,
          pagelen: 10,
          next: 'https://api.bitbucket.org/2.0/repositories/my-workspace?page=2',
        },
      });

      const result = await Bitbucket.actions.listRepositories.handler(
        mockContext,
        parse('listRepositories', { query: 'name ~ "repo"', role: 'member', pageSize: 10 })
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.bitbucket.org/2.0/repositories/my-workspace',
        {
          params: {
            q: 'name ~ "repo"',
            role: 'member',
            sort: undefined,
            page: undefined,
            pagelen: 10,
          },
        }
      );
      expect(result).toEqual({
        values: [
          expect.objectContaining({
            slug: 'my-repo',
            fullName: 'my-workspace/my-repo',
            isPrivate: true,
            mainBranch: 'main',
            project: 'PROJ',
            url: 'https://bitbucket.org/my-workspace/my-repo',
          }),
        ],
        page: 1,
        pageSize: 10,
        size: undefined,
        hasMore: true,
      });
    });

    it('URL-encodes the workspace slug', async () => {
      mockClient.get.mockResolvedValue({ data: { values: [] } });
      const ctx = { ...mockContext, config: { workspace: 'my ws/x' } } as unknown as ActionContext;
      await Bitbucket.actions.listRepositories.handler(ctx, parse('listRepositories', {}));
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.bitbucket.org/2.0/repositories/my%20ws%2Fx',
        expect.anything()
      );
    });
  });

  describe('createPullRequest', () => {
    it('posts source, destination, reviewers, and flags', async () => {
      mockClient.post.mockResolvedValue({ data: samplePullRequest });

      const result = await Bitbucket.actions.createPullRequest.handler(
        mockContext,
        parse('createPullRequest', {
          repoSlug: 'my-repo',
          title: 'Fix config drift',
          sourceBranch: 'fix/config-drift',
          destinationBranch: 'main',
          description: 'Automated remediation',
          reviewers: ['rev-uuid', '{other-uuid}'],
          closeSourceBranch: true,
          draft: false,
        })
      );

      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pullrequests`, {
        title: 'Fix config drift',
        description: 'Automated remediation',
        source: { branch: { name: 'fix/config-drift' } },
        destination: { branch: { name: 'main' } },
        reviewers: [{ uuid: '{rev-uuid}' }, { uuid: '{other-uuid}' }],
        close_source_branch: true,
        draft: false,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 7,
          state: 'OPEN',
          sourceBranch: 'fix/config-drift',
          sourceCommit: 'abc123',
          destinationBranch: 'main',
          approvalCount: 1,
          url: 'https://bitbucket.org/my-workspace/my-repo/pull-requests/7',
        })
      );
      expect(result.reviewers).toEqual([
        { displayName: 'Reviewer', uuid: '{rev-uuid}', nickname: undefined, accountId: undefined },
      ]);
    });

    it('omits destination and reviewers when not provided', async () => {
      mockClient.post.mockResolvedValue({ data: samplePullRequest });
      await Bitbucket.actions.createPullRequest.handler(
        mockContext,
        parse('createPullRequest', { repoSlug: 'my-repo', title: 'T', sourceBranch: 'b' })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pullrequests`, {
        title: 'T',
        source: { branch: { name: 'b' } },
        description: undefined,
        destination: undefined,
        reviewers: undefined,
        close_source_branch: undefined,
        draft: undefined,
      });
    });
  });

  describe('getPullRequest', () => {
    it('fetches a pull request by id and encodes the repo slug', async () => {
      mockClient.get.mockResolvedValue({ data: samplePullRequest });
      const result = await Bitbucket.actions.getPullRequest.handler(
        mockContext,
        parse('getPullRequest', { repoSlug: 'my repo', pullRequestId: 7 })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.bitbucket.org/2.0/repositories/my-workspace/my%20repo/pullrequests/7'
      );
      expect(result.participants).toHaveLength(2);
      expect(result.approvalCount).toBe(1);
      expect(result.mergeCommit).toBeUndefined();
    });

    it('leaves reviewers, participants, and approvalCount undefined when Bitbucket omits them', async () => {
      const { reviewers, participants, ...listShapedPullRequest } = samplePullRequest;
      mockClient.get.mockResolvedValue({ data: listShapedPullRequest });
      const result = await Bitbucket.actions.getPullRequest.handler(
        mockContext,
        parse('getPullRequest', { repoSlug: 'my-repo', pullRequestId: 7 })
      );
      expect(result.reviewers).toBeUndefined();
      expect(result.participants).toBeUndefined();
      expect(result.approvalCount).toBeUndefined();
      expect(reviewers).toBeDefined();
      expect(participants).toBeDefined();
    });
  });

  describe('listPullRequests', () => {
    it('sends repeated state params and pagination when no query is given', async () => {
      mockClient.get.mockResolvedValue({
        data: { values: [samplePullRequest], page: 2, pagelen: 5 },
      });

      const result = await Bitbucket.actions.listPullRequests.handler(
        mockContext,
        parse('listPullRequests', {
          repoSlug: 'my-repo',
          state: ['MERGED', 'DECLINED'],
          sort: '-updated_on',
          page: 2,
          pageSize: 5,
        })
      );

      expect(mockClient.get).toHaveBeenCalledWith(`${REPO_URL}/pullrequests`, {
        params: {
          state: ['MERGED', 'DECLINED'],
          q: undefined,
          sort: '-updated_on',
          page: 2,
          pagelen: 5,
        },
        paramsSerializer: { indexes: null },
      });
      expect(result.values).toHaveLength(1);
      expect(result).toEqual(expect.objectContaining({ page: 2, pageSize: 5, hasMore: false }));
    });

    it('defaults to OPEN pull requests', async () => {
      mockClient.get.mockResolvedValue({ data: { values: [] } });
      await Bitbucket.actions.listPullRequests.handler(
        mockContext,
        parse('listPullRequests', { repoSlug: 'my-repo' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${REPO_URL}/pullrequests`,
        expect.objectContaining({
          params: expect.objectContaining({ state: ['OPEN'], q: undefined }),
        })
      );
    });

    it('folds the state filter into q when a query is given', async () => {
      mockClient.get.mockResolvedValue({ data: { values: [] } });
      await Bitbucket.actions.listPullRequests.handler(
        mockContext,
        parse('listPullRequests', {
          repoSlug: 'my-repo',
          state: ['MERGED', 'DECLINED'],
          query: 'title ~ "fix"',
        })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${REPO_URL}/pullrequests`,
        expect.objectContaining({
          params: expect.objectContaining({
            state: undefined,
            q: '(state = "MERGED" OR state = "DECLINED") AND (title ~ "fix")',
          }),
        })
      );
    });

    it('rejects an empty state array', () => {
      expect(() =>
        parse('listPullRequests', { repoSlug: 'my-repo', state: [], query: 'title ~ "fix"' })
      ).toThrow();
    });

    it('keeps the OPEN default when only a query is given', async () => {
      mockClient.get.mockResolvedValue({ data: { values: [] } });
      await Bitbucket.actions.listPullRequests.handler(
        mockContext,
        parse('listPullRequests', { repoSlug: 'my-repo', query: 'title ~ "fix"' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${REPO_URL}/pullrequests`,
        expect.objectContaining({
          params: expect.objectContaining({ q: '(state = "OPEN") AND (title ~ "fix")' }),
        })
      );
    });
  });

  describe('updatePullRequest', () => {
    it('requires at least one field to update', () => {
      expect(() => parse('updatePullRequest', { repoSlug: 'my-repo', pullRequestId: 7 })).toThrow();
    });

    it('reads the current pull request and backfills omitted fields', async () => {
      mockClient.get.mockResolvedValue({ data: samplePullRequest });
      mockClient.put.mockResolvedValue({ data: { ...samplePullRequest, title: 'New title' } });

      const result = await Bitbucket.actions.updatePullRequest.handler(
        mockContext,
        parse('updatePullRequest', { repoSlug: 'my-repo', pullRequestId: 7, title: 'New title' })
      );

      expect(mockClient.get).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7`);
      expect(mockClient.put).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7`, {
        title: 'New title',
        description: 'Automated remediation',
        reviewers: [{ uuid: '{rev-uuid}' }],
        destination: undefined,
      });
      expect(result.title).toBe('New title');
    });

    it('replaces reviewers and destination when provided', async () => {
      mockClient.get.mockResolvedValue({ data: samplePullRequest });
      mockClient.put.mockResolvedValue({ data: samplePullRequest });

      await Bitbucket.actions.updatePullRequest.handler(
        mockContext,
        parse('updatePullRequest', {
          repoSlug: 'my-repo',
          pullRequestId: 7,
          reviewers: [],
          destinationBranch: 'release/1.0',
        })
      );

      expect(mockClient.put).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7`, {
        title: 'Fix config drift',
        description: 'Automated remediation',
        reviewers: [],
        destination: { branch: { name: 'release/1.0' } },
      });
    });
  });

  describe('mergePullRequest', () => {
    it('posts merge parameters and returns the merge commit', async () => {
      mockClient.post.mockResolvedValue({
        data: { ...samplePullRequest, state: 'MERGED', merge_commit: { hash: 'm3rge' } },
      });

      const result = await Bitbucket.actions.mergePullRequest.handler(
        mockContext,
        parse('mergePullRequest', {
          repoSlug: 'my-repo',
          pullRequestId: 7,
          mergeStrategy: 'squash',
          message: 'Squash it',
          closeSourceBranch: true,
        })
      );

      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7/merge`, {
        type: 'pullrequest',
        merge_strategy: 'squash',
        message: 'Squash it',
        close_source_branch: true,
      });
      expect(result).toEqual(expect.objectContaining({ state: 'MERGED', mergeCommit: 'm3rge' }));
    });
  });

  describe('approvePullRequest / declinePullRequest', () => {
    it('approves and returns the participant', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          user: { display_name: 'Bot', uuid: '{bot-uuid}' },
          role: 'PARTICIPANT',
          approved: true,
        },
      });
      const result = await Bitbucket.actions.approvePullRequest.handler(
        mockContext,
        parse('approvePullRequest', { repoSlug: 'my-repo', pullRequestId: 7 })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7/approve`);
      expect(result).toEqual(
        expect.objectContaining({
          approved: true,
          user: expect.objectContaining({ uuid: '{bot-uuid}' }),
        })
      );
    });

    it('declines and returns the declined pull request', async () => {
      mockClient.post.mockResolvedValue({
        data: { ...samplePullRequest, state: 'DECLINED', reason: 'Policy check failed' },
      });
      const result = await Bitbucket.actions.declinePullRequest.handler(
        mockContext,
        parse('declinePullRequest', { repoSlug: 'my-repo', pullRequestId: 7 })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7/decline`);
      expect(result).toEqual(
        expect.objectContaining({ state: 'DECLINED', declineReason: 'Policy check failed' })
      );
    });
  });

  describe('addPullRequestComment', () => {
    it('posts a general comment', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          id: 99,
          content: { raw: 'Looks good' },
          user: { display_name: 'Bot' },
          created_on: '2026-01-03T00:00:00Z',
          links: { html: { href: 'https://bitbucket.org/c/99' } },
        },
      });
      const result = await Bitbucket.actions.addPullRequestComment.handler(
        mockContext,
        parse('addPullRequestComment', {
          repoSlug: 'my-repo',
          pullRequestId: 7,
          content: 'Looks good',
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7/comments`, {
        content: { raw: 'Looks good' },
        inline: undefined,
        parent: undefined,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 99,
          content: 'Looks good',
          url: 'https://bitbucket.org/c/99',
        })
      );
    });

    it('posts an inline threaded reply', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          id: 100,
          content: { raw: 'nit' },
          inline: { path: 'a.yml', to: 3 },
          parent: { id: 99 },
        },
      });
      const result = await Bitbucket.actions.addPullRequestComment.handler(
        mockContext,
        parse('addPullRequestComment', {
          repoSlug: 'my-repo',
          pullRequestId: 7,
          content: 'nit',
          path: 'a.yml',
          line: 3,
          parentCommentId: 99,
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pullrequests/7/comments`, {
        content: { raw: 'nit' },
        inline: { path: 'a.yml', to: 3 },
        parent: { id: 99 },
      });
      expect(result.inline).toEqual({ path: 'a.yml', from: undefined, to: 3 });
      expect(result.parentId).toBe(99);
    });

    it('rejects a line without a path', () => {
      expect(() =>
        parse('addPullRequestComment', {
          repoSlug: 'my-repo',
          pullRequestId: 7,
          content: 'x',
          line: 3,
        })
      ).toThrow();
    });
  });

  describe('branches', () => {
    const branch = {
      name: 'fix/config-drift',
      target: {
        hash: 'abc123',
        message: 'Initial commit',
        date: '2026-01-01T00:00:00Z',
        author: { raw: 'Bot <bot@example.com>', user: { display_name: 'Bot', uuid: '{bot-uuid}' } },
        parents: [{ hash: 'p1' }],
      },
      merge_strategies: ['merge_commit', 'squash'],
      default_merge_strategy: 'merge_commit',
      links: { html: { href: 'https://bitbucket.org/b' } },
    };

    it('creates a branch from a target hash', async () => {
      mockClient.post.mockResolvedValue({ data: branch });
      const result = await Bitbucket.actions.createBranch.handler(
        mockContext,
        parse('createBranch', { repoSlug: 'my-repo', name: 'fix/config-drift', target: 'abc123' })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/refs/branches`, {
        name: 'fix/config-drift',
        target: { hash: 'abc123' },
      });
      expect(result).toEqual(
        expect.objectContaining({
          name: 'fix/config-drift',
          defaultMergeStrategy: 'merge_commit',
          target: expect.objectContaining({ hash: 'abc123', parents: ['p1'] }),
        })
      );
    });

    it('gets a branch with the name URL-encoded', async () => {
      mockClient.get.mockResolvedValue({ data: branch });
      await Bitbucket.actions.getBranch.handler(
        mockContext,
        parse('getBranch', { repoSlug: 'my-repo', name: 'fix/config-drift' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${REPO_URL}/refs/branches/fix%2Fconfig-drift`);
    });

    it('deletes a branch and returns a confirmation', async () => {
      mockClient.delete.mockResolvedValue({ status: 204 });
      const result = await Bitbucket.actions.deleteBranch.handler(
        mockContext,
        parse('deleteBranch', { repoSlug: 'my-repo', name: 'fix/config-drift' })
      );
      expect(mockClient.delete).toHaveBeenCalledWith(
        `${REPO_URL}/refs/branches/fix%2Fconfig-drift`
      );
      expect(result).toEqual({ deleted: true, name: 'fix/config-drift' });
    });
  });

  describe('commits', () => {
    const commit = {
      hash: 'abc1234',
      message: 'Initial commit',
      date: '2026-01-01T00:00:00Z',
      author: { raw: 'Bot <bot@example.com>' },
      parents: [],
      links: { html: { href: 'https://bitbucket.org/c/abc1234' } },
    };

    it('gets a commit by hash', async () => {
      mockClient.get.mockResolvedValue({ data: commit });
      const result = await Bitbucket.actions.getCommit.handler(
        mockContext,
        parse('getCommit', { repoSlug: 'my-repo', commit: 'abc1234' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${REPO_URL}/commit/abc1234`);
      expect(result).toEqual({
        hash: 'abc1234',
        message: 'Initial commit',
        date: '2026-01-01T00:00:00Z',
        author: { raw: 'Bot <bot@example.com>', user: undefined },
        parents: [],
        url: 'https://bitbucket.org/c/abc1234',
      });
    });

    it('rejects a non-hex commit hash', () => {
      expect(() => parse('getCommit', { repoSlug: 'my-repo', commit: 'main' })).toThrow();
    });

    it('lists commits from a revision with a path filter', async () => {
      mockClient.get.mockResolvedValue({ data: { values: [commit], next: undefined } });
      const result = await Bitbucket.actions.listCommits.handler(
        mockContext,
        parse('listCommits', { repoSlug: 'my-repo', revision: 'main', path: 'src/', pageSize: 20 })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${REPO_URL}/commits/main`, {
        params: { path: 'src/', page: undefined, pagelen: 20 },
      });
      expect(result.values).toEqual([expect.objectContaining({ hash: 'abc1234' })]);
      expect(result.hasMore).toBe(false);
    });

    it('lists commits from the default branch when revision is omitted', async () => {
      mockClient.get.mockResolvedValue({ data: { values: [] } });
      await Bitbucket.actions.listCommits.handler(
        mockContext,
        parse('listCommits', { repoSlug: 'my-repo' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${REPO_URL}/commits`, expect.anything());
    });

    it('creates a build status on a commit', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          key: 'KIBANA-CHECK',
          state: 'SUCCESSFUL',
          name: 'Policy check',
          url: 'https://kibana.example.com/run/1',
          description: 'ok',
          refname: 'fix/config-drift',
          created_on: '2026-01-01T00:00:00Z',
        },
      });
      const result = await Bitbucket.actions.createCommitBuildStatus.handler(
        mockContext,
        parse('createCommitBuildStatus', {
          repoSlug: 'my-repo',
          commit: 'abc1234',
          state: 'SUCCESSFUL',
          key: 'KIBANA-CHECK',
          url: 'https://kibana.example.com/run/1',
          name: 'Policy check',
          description: 'ok',
          refname: 'fix/config-drift',
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/commit/abc1234/statuses/build`, {
        state: 'SUCCESSFUL',
        key: 'KIBANA-CHECK',
        url: 'https://kibana.example.com/run/1',
        name: 'Policy check',
        description: 'ok',
        refname: 'fix/config-drift',
      });
      expect(result).toEqual(
        expect.objectContaining({
          key: 'KIBANA-CHECK',
          state: 'SUCCESSFUL',
          refname: 'fix/config-drift',
        })
      );
    });
  });

  describe('pipelines', () => {
    const pipeline = {
      uuid: '{pipe-uuid}',
      build_number: 12,
      state: { name: 'IN_PROGRESS', stage: { name: 'RUNNING' } },
      target: { type: 'pipeline_ref_target', ref_type: 'branch', ref_name: 'main' },
      trigger: { name: 'MANUAL' },
      created_on: '2026-01-01T00:00:00Z',
    };

    it('triggers a pipeline for a branch', async () => {
      mockClient.post.mockResolvedValue({ data: pipeline });
      const result = await Bitbucket.actions.triggerPipeline.handler(
        mockContext,
        parse('triggerPipeline', { repoSlug: 'my-repo', branch: 'main' })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pipelines`, {
        target: {
          type: 'pipeline_ref_target',
          ref_type: 'branch',
          ref_name: 'main',
          commit: undefined,
          selector: undefined,
        },
        variables: undefined,
      });
      expect(result).toEqual(
        expect.objectContaining({
          uuid: '{pipe-uuid}',
          buildNumber: 12,
          state: 'IN_PROGRESS',
          stage: 'RUNNING',
          result: undefined,
          url: 'https://bitbucket.org/my-workspace/my-repo/pipelines/results/12',
        })
      );
    });

    it('triggers a custom pipeline for a commit on a branch with variables', async () => {
      mockClient.post.mockResolvedValue({ data: pipeline });
      await Bitbucket.actions.triggerPipeline.handler(
        mockContext,
        parse('triggerPipeline', {
          repoSlug: 'my-repo',
          branch: 'main',
          commit: 'abc1234',
          customPipeline: 'deploy',
          variables: [
            { key: 'ENV', value: 'staging' },
            { key: 'SECRET', value: 's', secured: true },
          ],
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pipelines`, {
        target: {
          type: 'pipeline_ref_target',
          ref_type: 'branch',
          ref_name: 'main',
          commit: { type: 'commit', hash: 'abc1234' },
          selector: { type: 'custom', pattern: 'deploy' },
        },
        variables: [
          { key: 'ENV', value: 'staging', secured: false },
          { key: 'SECRET', value: 's', secured: true },
        ],
      });
    });

    it('triggers a pipeline for a bare commit', async () => {
      mockClient.post.mockResolvedValue({ data: pipeline });
      await Bitbucket.actions.triggerPipeline.handler(
        mockContext,
        parse('triggerPipeline', {
          repoSlug: 'my-repo',
          commit: 'abc1234',
          customPipeline: 'deploy',
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${REPO_URL}/pipelines`, {
        target: {
          type: 'pipeline_commit_target',
          commit: { type: 'commit', hash: 'abc1234' },
          selector: { type: 'custom', pattern: 'deploy' },
        },
        variables: undefined,
      });
    });

    it('requires a branch or a commit', () => {
      expect(() => parse('triggerPipeline', { repoSlug: 'my-repo' })).toThrow();
    });

    it('gets a pipeline and normalizes the uuid braces', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          ...pipeline,
          state: { name: 'COMPLETED', result: { name: 'SUCCESSFUL' } },
          completed_on: '2026-01-01T00:10:00Z',
        },
      });
      const result = await Bitbucket.actions.getPipeline.handler(
        mockContext,
        parse('getPipeline', { repoSlug: 'my-repo', pipelineUuid: 'pipe-uuid' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${REPO_URL}/pipelines/%7Bpipe-uuid%7D`);
      expect(result).toEqual(
        expect.objectContaining({ state: 'COMPLETED', result: 'SUCCESSFUL', stage: undefined })
      );
    });

    it('stops a pipeline', async () => {
      mockClient.post.mockResolvedValue({ status: 204 });
      const result = await Bitbucket.actions.stopPipeline.handler(
        mockContext,
        parse('stopPipeline', { repoSlug: 'my-repo', pipelineUuid: '{pipe-uuid}' })
      );
      expect(mockClient.post).toHaveBeenCalledWith(
        `${REPO_URL}/pipelines/%7Bpipe-uuid%7D/stopPipeline`
      );
      expect(result).toEqual({ stopped: true, uuid: '{pipe-uuid}' });
    });
  });

  describe('test handler', () => {
    it('is enabled and reports the workspace on success', async () => {
      expect(Bitbucket.test.enabled).toBe(true);
      mockClient.get.mockResolvedValue({ data: { values: [{ slug: 'my-repo' }] } });
      const result = await Bitbucket.test.handler(mockContext);
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.bitbucket.org/2.0/repositories/my-workspace',
        { params: { pagelen: 1 } }
      );
      expect(result).toEqual({ message: 'Connected to Bitbucket workspace "my-workspace".' });
    });

    it('warns when no repositories are visible', async () => {
      mockClient.get.mockResolvedValue({ data: { values: [] } });
      const result = await Bitbucket.test.handler(mockContext);
      expect(result.message).toContain('no repositories are visible');
    });
  });
});
