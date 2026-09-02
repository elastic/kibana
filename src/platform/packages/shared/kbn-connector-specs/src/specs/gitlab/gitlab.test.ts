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
import { GitLab } from './gitlab';

const API = 'https://gitlab.com/api/v4';
const PROJECT = `${API}/projects/my-group%2Fmy-repo`;

const parse = <K extends keyof typeof GitLab.actions>(action: K, raw: Record<string, unknown>) =>
  GitLab.actions[action].input.parse(raw);

const paged = <T>(data: T[], headers: Record<string, string> = {}) => ({ data, headers });

const sampleUser = { id: 7, username: 'jdoe', name: 'Jane Doe', state: 'active', web_url: 'u' };

const sampleIssue = {
  id: 100,
  iid: 3,
  project_id: 42,
  title: 'Leaked key',
  description: 'Found AKIA...',
  state: 'opened',
  labels: ['security'],
  assignees: [sampleUser],
  author: sampleUser,
  milestone: { title: 'Q4' },
  confidential: true,
  issue_type: 'incident',
  user_notes_count: 2,
  web_url: 'https://gitlab.com/my-group/my-repo/-/issues/3',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  closed_at: null,
};

const sampleMergeRequest = {
  id: 200,
  iid: 5,
  project_id: 42,
  title: 'Fix drift',
  state: 'opened',
  draft: false,
  detailed_merge_status: 'mergeable',
  has_conflicts: false,
  source_branch: 'fix/drift',
  target_branch: 'main',
  sha: 'abc123',
  merge_commit_sha: null,
  labels: [],
  author: sampleUser,
  assignees: [],
  reviewers: [sampleUser],
  changes_count: '2',
  head_pipeline: { id: 900, status: 'success', web_url: 'p' },
  web_url: 'https://gitlab.com/my-group/my-repo/-/merge_requests/5',
};

const samplePipeline = {
  id: 900,
  iid: 12,
  project_id: 42,
  status: 'pending',
  source: 'api',
  ref: 'main',
  sha: 'abc123',
  web_url: 'https://gitlab.com/my-group/my-repo/-/pipelines/900',
  user: sampleUser,
  created_at: '2026-01-01T00:00:00Z',
  started_at: null,
  finished_at: null,
  duration: null,
};

describe('GitLab', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {},
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is defined and wired into all_specs', () => {
    expect(GitLab).toBeDefined();
    expect(getConnectorSpec('.gitlab')).toBe(GitLab);
  });

  it('has the expected metadata and auth types', () => {
    expect(GitLab.metadata.id).toBe('.gitlab');
    expect(GitLab.metadata.minimumLicense).toBe('enterprise');
    expect(GitLab.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    const types = GitLab.auth?.types as Array<{ type: string; defaults?: Record<string, unknown> }>;
    expect(types.map((t) => t.type)).toEqual(['api_key_header', 'bearer']);
    expect(types[0].defaults).toEqual({ headerField: 'PRIVATE-TOKEN' });
  });

  it('marks every action as a tool with an explicit scope and description', () => {
    for (const action of Object.values(GitLab.actions)) {
      expect(action.isTool).toBe(true);
      expect(['read', 'write', 'destroy']).toContain(action.scope);
      expect(action.description).toBeTruthy();
    }
  });

  describe('base URL handling', () => {
    it('defaults to gitlab.com', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 1, name: 'p' } });
      await GitLab.actions.getProject.handler(mockContext, parse('getProject', { projectId: '1' }));
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/1`);
    });

    it('uses a self-managed URL and strips trailing slashes and /api/v4', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 1 } });
      const ctx = {
        ...mockContext,
        config: { baseUrl: 'https://gitlab.example.com/api/v4/' },
      } as unknown as ActionContext;
      await GitLab.actions.getProject.handler(ctx, parse('getProject', { projectId: '1' }));
      expect(mockClient.get).toHaveBeenCalledWith('https://gitlab.example.com/api/v4/projects/1');
    });

    it('URL-encodes a namespace/project path', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 1 } });
      await GitLab.actions.getProject.handler(
        mockContext,
        parse('getProject', { projectId: 'my-group/my-repo' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(PROJECT);
    });
  });

  it('formats GitLab API errors with status and message', async () => {
    mockClient.get.mockRejectedValue({
      message: 'Request failed with status code 404',
      response: { status: 404, data: { message: '404 Project Not Found' } },
    });
    await expect(
      GitLab.actions.getProject.handler(mockContext, parse('getProject', { projectId: '1' }))
    ).rejects.toThrow('GitLab getProject failed (status 404): 404 Project Not Found');
  });

  it('stringifies object error messages', async () => {
    mockClient.post.mockRejectedValue({
      message: 'Request failed with status code 400',
      response: { status: 400, data: { message: { base: ['Reference not found'] } } },
    });
    await expect(
      GitLab.actions.triggerPipeline.handler(
        mockContext,
        parse('triggerPipeline', { projectId: '1', ref: 'nope' })
      )
    ).rejects.toThrow(
      'GitLab triggerPipeline failed (status 400): {"base":["Reference not found"]}'
    );
  });

  describe('pagination', () => {
    it('reads GitLab pagination headers', async () => {
      mockClient.get.mockResolvedValue(
        paged([{ id: 1, path_with_namespace: 'g/p' }], {
          'x-page': '2',
          'x-per-page': '20',
          'x-next-page': '3',
          'x-total': '55',
        })
      );
      const result = await GitLab.actions.listProjects.handler(
        mockContext,
        parse('listProjects', { search: 'p', page: 2 })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects`, {
        params: expect.objectContaining({ search: 'p', membership: true, simple: true, page: 2 }),
      });
      expect(result).toEqual({
        values: [expect.objectContaining({ id: 1, pathWithNamespace: 'g/p' })],
        page: 2,
        perPage: 20,
        total: 55,
        nextPage: 3,
        hasMore: true,
      });
    });

    it('reports hasMore false and no total on the last page', async () => {
      mockClient.get.mockResolvedValue(
        paged([], { 'x-page': '3', 'x-per-page': '20', 'x-next-page': '', 'x-total': '' })
      );
      const result = await GitLab.actions.listGroups.handler(mockContext, parse('listGroups', {}));
      expect(result).toEqual(
        expect.objectContaining({
          values: [],
          nextPage: undefined,
          total: undefined,
          hasMore: false,
        })
      );
    });
  });

  describe('users and groups', () => {
    it('lists users with search params', async () => {
      mockClient.get.mockResolvedValue(paged([sampleUser]));
      const result = await GitLab.actions.listUsers.handler(
        mockContext,
        parse('listUsers', { search: 'jane', active: true })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/users`, {
        params: {
          search: 'jane',
          username: undefined,
          active: true,
          page: undefined,
          per_page: undefined,
        },
      });
      expect(result.values).toEqual([
        { id: 7, username: 'jdoe', name: 'Jane Doe', state: 'active', webUrl: 'u' },
      ]);
    });

    it('lists groups', async () => {
      mockClient.get.mockResolvedValue(
        paged([{ id: 9, full_path: 'my-group', visibility: 'private', parent_id: null }])
      );
      const result = await GitLab.actions.listGroups.handler(
        mockContext,
        parse('listGroups', { search: 'my', topLevelOnly: true })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/groups`, {
        params: { search: 'my', top_level_only: true, page: undefined, per_page: undefined },
      });
      expect(result.values[0]).toEqual(
        expect.objectContaining({ id: 9, fullPath: 'my-group', parentId: undefined })
      );
    });
  });

  describe('issues', () => {
    it('lists issues with labels joined and filters mapped', async () => {
      mockClient.get.mockResolvedValue(paged([sampleIssue]));
      const result = await GitLab.actions.listIssues.handler(
        mockContext,
        parse('listIssues', {
          projectId: 'my-group/my-repo',
          state: 'opened',
          labels: ['security', 'p1'],
          assigneeUsername: 'jdoe',
          orderBy: 'updated_at',
          sort: 'desc',
          perPage: 50,
        })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${PROJECT}/issues`, {
        params: expect.objectContaining({
          state: 'opened',
          labels: 'security,p1',
          assignee_username: 'jdoe',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: 50,
        }),
      });
      expect(result.values[0]).toEqual(
        expect.objectContaining({
          iid: 3,
          title: 'Leaked key',
          labels: ['security'],
          milestone: 'Q4',
          confidential: true,
          issueType: 'incident',
          notesCount: 2,
          closedAt: undefined,
          assignees: [expect.objectContaining({ username: 'jdoe' })],
        })
      );
    });

    it('gets an issue by iid', async () => {
      mockClient.get.mockResolvedValue({ data: sampleIssue });
      await GitLab.actions.getIssue.handler(
        mockContext,
        parse('getIssue', { projectId: '42', issueIid: 3 })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/issues/3`);
    });

    it('creates an issue', async () => {
      mockClient.post.mockResolvedValue({ data: sampleIssue });
      const result = await GitLab.actions.createIssue.handler(
        mockContext,
        parse('createIssue', {
          projectId: '42',
          title: 'Leaked key',
          description: 'Found AKIA...',
          labels: ['security'],
          assigneeIds: [7],
          confidential: true,
          issueType: 'incident',
          dueDate: '2026-02-01',
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/issues`, {
        title: 'Leaked key',
        description: 'Found AKIA...',
        labels: 'security',
        assignee_ids: [7],
        confidential: true,
        issue_type: 'incident',
        due_date: '2026-02-01',
      });
      expect(result.iid).toBe(3);
      expect(result.webUrl).toBe('https://gitlab.com/my-group/my-repo/-/issues/3');
    });

    it('rejects an invalid due date', () => {
      expect(() =>
        parse('createIssue', { projectId: '42', title: 't', dueDate: '01/02/2026' })
      ).toThrow();
    });

    it('updates an issue and requires at least one field', async () => {
      expect(() => parse('updateIssue', { projectId: '42', issueIid: 3 })).toThrow();
      mockClient.put.mockResolvedValue({ data: { ...sampleIssue, state: 'closed' } });
      const result = await GitLab.actions.updateIssue.handler(
        mockContext,
        parse('updateIssue', {
          projectId: '42',
          issueIid: 3,
          stateEvent: 'close',
          addLabels: ['remediated'],
          assigneeIds: [],
        })
      );
      expect(mockClient.put).toHaveBeenCalledWith(`${API}/projects/42/issues/3`, {
        title: undefined,
        description: undefined,
        state_event: 'close',
        labels: undefined,
        add_labels: 'remediated',
        remove_labels: undefined,
        assignee_ids: [],
        confidential: undefined,
        due_date: undefined,
      });
      expect(result.state).toBe('closed');
    });

    it('creates an issue note', async () => {
      mockClient.post.mockResolvedValue({
        data: { id: 55, body: 'hi', author: sampleUser, noteable_type: 'Issue', noteable_iid: 3 },
      });
      const result = await GitLab.actions.createIssueNote.handler(
        mockContext,
        parse('createIssueNote', { projectId: '42', issueIid: 3, body: 'hi', internal: true })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/issues/3/notes`, {
        body: 'hi',
        internal: true,
      });
      expect(result).toEqual(
        expect.objectContaining({ id: 55, body: 'hi', noteableType: 'Issue', noteableIid: 3 })
      );
    });
  });

  describe('merge requests', () => {
    it('lists merge requests', async () => {
      mockClient.get.mockResolvedValue(paged([sampleMergeRequest]));
      const result = await GitLab.actions.listMergeRequests.handler(
        mockContext,
        parse('listMergeRequests', {
          projectId: '42',
          state: 'opened',
          sourceBranch: 'fix/drift',
          labels: ['a', 'b'],
        })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/merge_requests`, {
        params: expect.objectContaining({
          state: 'opened',
          source_branch: 'fix/drift',
          labels: 'a,b',
        }),
      });
      expect(result.values[0]).toEqual(
        expect.objectContaining({
          iid: 5,
          mergeStatus: 'mergeable',
          headPipeline: { id: 900, status: 'success', webUrl: 'p' },
          reviewers: [expect.objectContaining({ id: 7 })],
        })
      );
    });

    it('gets a merge request with approvals and changed files by default', async () => {
      mockClient.get.mockImplementation(async (url: string) => {
        if (url.endsWith('/approvals')) {
          return {
            data: {
              approved: true,
              approvals_required: 1,
              approvals_left: 0,
              approved_by: [{ user: sampleUser }],
            },
          };
        }
        if (url.endsWith('/diffs')) {
          return {
            data: [
              {
                old_path: 'a.yml',
                new_path: 'a.yml',
                new_file: false,
                renamed_file: false,
                deleted_file: false,
                diff: '@@',
              },
            ],
          };
        }
        return { data: sampleMergeRequest };
      });
      const result = await GitLab.actions.getMergeRequest.handler(
        mockContext,
        parse('getMergeRequest', { projectId: '42', mergeRequestIid: 5 })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/merge_requests/5`);
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/merge_requests/5/approvals`);
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/merge_requests/5/diffs`, {
        params: { per_page: 100 },
      });
      expect(result).toEqual(
        expect.objectContaining({
          iid: 5,
          approvals: expect.objectContaining({
            approved: true,
            approvalsLeft: 0,
            approvedBy: [expect.objectContaining({ username: 'jdoe' })],
          }),
          changedFiles: [
            {
              oldPath: 'a.yml',
              newPath: 'a.yml',
              newFile: false,
              renamedFile: false,
              deletedFile: false,
            },
          ],
          changedFilesTruncated: false,
        })
      );
    });

    it('flags changedFiles as truncated when a full page of diffs comes back', async () => {
      mockClient.get.mockImplementation(async (url: string) => {
        if (url.endsWith('/approvals')) {
          return { data: { approved: false } };
        }
        if (url.endsWith('/diffs')) {
          return {
            data: Array.from({ length: 100 }, (_, index) => ({ new_path: `f${index}.ts` })),
          };
        }
        return { data: sampleMergeRequest };
      });
      const result = await GitLab.actions.getMergeRequest.handler(
        mockContext,
        parse('getMergeRequest', { projectId: '42', mergeRequestIid: 5 })
      );
      expect(result.changedFiles).toHaveLength(100);
      expect(result.changedFilesTruncated).toBe(true);
    });

    it('skips approvals and diffs when includeDiffSummary is false', async () => {
      mockClient.get.mockResolvedValue({ data: sampleMergeRequest });
      const result = await GitLab.actions.getMergeRequest.handler(
        mockContext,
        parse('getMergeRequest', { projectId: '42', mergeRequestIid: 5, includeDiffSummary: false })
      );
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).not.toHaveProperty('approvals');
    });

    it('creates a merge request', async () => {
      mockClient.post.mockResolvedValue({ data: sampleMergeRequest });
      await GitLab.actions.createMergeRequest.handler(
        mockContext,
        parse('createMergeRequest', {
          projectId: '42',
          title: 'Fix drift',
          sourceBranch: 'fix/drift',
          targetBranch: 'main',
          reviewerIds: [7],
          removeSourceBranch: true,
          squash: true,
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/merge_requests`, {
        title: 'Fix drift',
        source_branch: 'fix/drift',
        target_branch: 'main',
        description: undefined,
        labels: undefined,
        assignee_ids: undefined,
        reviewer_ids: [7],
        remove_source_branch: true,
        squash: true,
      });
    });

    it('updates a merge request and requires at least one field', async () => {
      expect(() => parse('updateMergeRequest', { projectId: '42', mergeRequestIid: 5 })).toThrow();
      mockClient.put.mockResolvedValue({ data: { ...sampleMergeRequest, state: 'closed' } });
      await GitLab.actions.updateMergeRequest.handler(
        mockContext,
        parse('updateMergeRequest', {
          projectId: '42',
          mergeRequestIid: 5,
          stateEvent: 'close',
          removeLabels: ['wip'],
        })
      );
      expect(mockClient.put).toHaveBeenCalledWith(
        `${API}/projects/42/merge_requests/5`,
        expect.objectContaining({ state_event: 'close', remove_labels: 'wip' })
      );
    });

    it('approves with an optional sha', async () => {
      mockClient.post.mockResolvedValue({
        data: { approved: true, approvals_left: 0, approved_by: [] },
      });
      const result = await GitLab.actions.approveMergeRequest.handler(
        mockContext,
        parse('approveMergeRequest', { projectId: '42', mergeRequestIid: 5, sha: 'abc1234' })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/merge_requests/5/approve`, {
        sha: 'abc1234',
      });
      expect(result).toEqual(expect.objectContaining({ approved: true, approvalsLeft: 0 }));
    });

    it('accepts (merges) a merge request', async () => {
      mockClient.put.mockResolvedValue({
        data: { ...sampleMergeRequest, state: 'merged', merge_commit_sha: 'm3rge' },
      });
      const result = await GitLab.actions.acceptMergeRequest.handler(
        mockContext,
        parse('acceptMergeRequest', {
          projectId: '42',
          mergeRequestIid: 5,
          squash: true,
          squashCommitMessage: 'Squash',
          shouldRemoveSourceBranch: true,
        })
      );
      expect(mockClient.put).toHaveBeenCalledWith(`${API}/projects/42/merge_requests/5/merge`, {
        merge_commit_message: undefined,
        squash: true,
        squash_commit_message: 'Squash',
        should_remove_source_branch: true,
        auto_merge: undefined,
        sha: undefined,
      });
      expect(result).toEqual(expect.objectContaining({ state: 'merged', mergeCommitSha: 'm3rge' }));
    });

    it('creates a merge request note', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 56, body: 'LGTM' } });
      await GitLab.actions.createMergeRequestNote.handler(
        mockContext,
        parse('createMergeRequestNote', { projectId: '42', mergeRequestIid: 5, body: 'LGTM' })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/merge_requests/5/notes`, {
        body: 'LGTM',
        internal: undefined,
      });
    });
  });

  describe('repository', () => {
    const sampleCommit = {
      id: 'abc123def',
      short_id: 'abc123de',
      title: 'Fix',
      message: 'Fix\n',
      author_name: 'Jane',
      author_email: 'j@example.com',
      authored_date: '2026-01-01T00:00:00Z',
      parent_ids: ['p1'],
      web_url: 'c',
      stats: { additions: 1, deletions: 0, total: 1 },
    };

    it('lists and creates branches', async () => {
      mockClient.get.mockResolvedValue(
        paged([
          { name: 'main', default: true, protected: true, merged: false, commit: sampleCommit },
        ])
      );
      const listed = await GitLab.actions.listBranches.handler(
        mockContext,
        parse('listBranches', { projectId: '42', search: '^main' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/repository/branches`, {
        params: { search: '^main', page: undefined, per_page: undefined },
      });
      expect(listed.values[0]).toEqual(
        expect.objectContaining({
          name: 'main',
          default: true,
          commit: expect.objectContaining({ shortId: 'abc123de' }),
        })
      );

      mockClient.post.mockResolvedValue({ data: { name: 'fix/drift', commit: sampleCommit } });
      await GitLab.actions.createBranch.handler(
        mockContext,
        parse('createBranch', { projectId: '42', branch: 'fix/drift', ref: 'main' })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/repository/branches`, {
        branch: 'fix/drift',
        ref: 'main',
      });
    });

    it('lists commits with filters', async () => {
      mockClient.get.mockResolvedValue(paged([sampleCommit]));
      const result = await GitLab.actions.listCommits.handler(
        mockContext,
        parse('listCommits', {
          projectId: '42',
          refName: 'main',
          path: 'src/',
          since: '2026-01-01T00:00:00Z',
        })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/repository/commits`, {
        params: expect.objectContaining({
          ref_name: 'main',
          path: 'src/',
          since: '2026-01-01T00:00:00Z',
        }),
      });
      expect(result.values[0]).toEqual(
        expect.objectContaining({ id: 'abc123def', parentIds: ['p1'] })
      );
    });

    it('gets a commit with a truncated diff', async () => {
      const longDiff = 'x'.repeat(5000);
      mockClient.get.mockImplementation(async (url: string) =>
        url.endsWith('/diff')
          ? {
              data: [
                { old_path: 'a', new_path: 'a', diff: longDiff },
                { new_path: 'b', new_file: true, diff: '+b' },
              ],
            }
          : { data: sampleCommit }
      );
      const result = await GitLab.actions.getCommit.handler(
        mockContext,
        parse('getCommit', { projectId: '42', sha: 'abc123def' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/42/repository/commits/abc123def`
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/42/repository/commits/abc123def/diff`,
        {
          params: { per_page: 100 },
        }
      );
      expect(result.diffs).toHaveLength(2);
      expect(result.diffs?.[0]).toEqual(
        expect.objectContaining({ diffTruncated: true, diff: 'x'.repeat(4000) })
      );
      expect(result.diffs?.[1]).toEqual(
        expect.objectContaining({ newFile: true, diffTruncated: false })
      );
      expect(result.diffsTruncated).toBe(false);
    });

    it('gets a commit without diff when includeDiff is false', async () => {
      mockClient.get.mockResolvedValue({ data: sampleCommit });
      const result = await GitLab.actions.getCommit.handler(
        mockContext,
        parse('getCommit', { projectId: '42', sha: 'main', includeDiff: false })
      );
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).not.toHaveProperty('diffs');
    });

    it('reads a text file and decodes base64', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          file_name: 'app.yml',
          file_path: 'config/app.yml',
          size: 12,
          encoding: 'base64',
          content: Buffer.from('level: 2\n').toString('base64'),
          ref: 'main',
          last_commit_id: 'abc123def',
        },
      });
      const result = await GitLab.actions.getFile.handler(
        mockContext,
        parse('getFile', { projectId: '42', filePath: 'config/app.yml', ref: 'main' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/42/repository/files/config%2Fapp.yml`,
        { params: { ref: 'main' } }
      );
      expect(result).toEqual(
        expect.objectContaining({
          filePath: 'config/app.yml',
          content: 'level: 2\n',
          encoding: 'text',
          lastCommitId: 'abc123def',
        })
      );
    });

    it('keeps binary file content as base64', async () => {
      const binary = Buffer.from([0xff, 0xfe, 0x00, 0x01]).toString('base64');
      mockClient.get.mockResolvedValue({
        data: { file_path: 'img.png', encoding: 'base64', content: binary },
      });
      const result = await GitLab.actions.getFile.handler(
        mockContext,
        parse('getFile', { projectId: '42', filePath: 'img.png', ref: 'main' })
      );
      expect(result).toEqual(expect.objectContaining({ content: binary, encoding: 'base64' }));
    });

    it('creates, updates, and deletes files', async () => {
      mockClient.post.mockResolvedValue({ data: { file_path: 'a.yml', branch: 'fix' } });
      await GitLab.actions.createFile.handler(
        mockContext,
        parse('createFile', {
          projectId: '42',
          filePath: 'a.yml',
          branch: 'fix',
          startBranch: 'main',
          content: 'a: 1',
          commitMessage: 'Add a',
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/repository/files/a.yml`, {
        branch: 'fix',
        start_branch: 'main',
        content: 'a: 1',
        commit_message: 'Add a',
        author_name: undefined,
        author_email: undefined,
      });

      mockClient.put.mockResolvedValue({ data: { file_path: 'a.yml', branch: 'fix' } });
      await GitLab.actions.updateFile.handler(
        mockContext,
        parse('updateFile', {
          projectId: '42',
          filePath: 'a.yml',
          branch: 'fix',
          content: 'a: 2',
          commitMessage: 'Update a',
          lastCommitId: 'abc123def',
        })
      );
      expect(mockClient.put).toHaveBeenCalledWith(
        `${API}/projects/42/repository/files/a.yml`,
        expect.objectContaining({ content: 'a: 2', last_commit_id: 'abc123def' })
      );

      mockClient.delete.mockResolvedValue({ status: 204 });
      const deleted = await GitLab.actions.deleteFile.handler(
        mockContext,
        parse('deleteFile', {
          projectId: '42',
          filePath: 'a.yml',
          branch: 'fix',
          commitMessage: 'Remove a',
        })
      );
      expect(mockClient.delete).toHaveBeenCalledWith(`${API}/projects/42/repository/files/a.yml`, {
        data: expect.objectContaining({ branch: 'fix', commit_message: 'Remove a' }),
      });
      expect(deleted).toEqual({ deleted: true, filePath: 'a.yml', branch: 'fix' });
    });

    it('lists tags and labels', async () => {
      mockClient.get.mockResolvedValue(
        paged([{ name: 'v1.0.0', target: 't', commit: sampleCommit }])
      );
      const tags = await GitLab.actions.listTags.handler(
        mockContext,
        parse('listTags', { projectId: '42', orderBy: 'version' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/repository/tags`, {
        params: expect.objectContaining({ order_by: 'version' }),
      });
      expect(tags.values[0]).toEqual(expect.objectContaining({ name: 'v1.0.0' }));

      mockClient.get.mockResolvedValue(paged([{ id: 1, name: 'security', color: '#f00' }]));
      await GitLab.actions.listLabels.handler(
        mockContext,
        parse('listLabels', { projectId: '42' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/labels`, {
        params: expect.objectContaining({ include_ancestor_groups: true }),
      });
    });

    it('searches code at project, group, and instance scope', async () => {
      mockClient.get.mockResolvedValue(
        paged([
          {
            path: 'a.yml',
            filename: 'a.yml',
            basename: 'a',
            ref: 'main',
            startline: 3,
            data: 'x',
            project_id: 42,
          },
        ])
      );
      const result = await GitLab.actions.searchCode.handler(
        mockContext,
        parse('searchCode', { search: 'AKIA', projectId: '42', ref: 'main' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/search`, {
        params: {
          scope: 'blobs',
          search: 'AKIA',
          ref: 'main',
          page: undefined,
          per_page: undefined,
        },
      });
      expect(result.values[0]).toEqual(
        expect.objectContaining({ path: 'a.yml', startLine: 3, projectId: 42 })
      );

      await GitLab.actions.searchCode.handler(
        mockContext,
        parse('searchCode', { search: 'AKIA', groupId: 'my-group' })
      );
      expect(mockClient.get).toHaveBeenLastCalledWith(
        `${API}/groups/my-group/search`,
        expect.anything()
      );

      await GitLab.actions.searchCode.handler(mockContext, parse('searchCode', { search: 'AKIA' }));
      expect(mockClient.get).toHaveBeenLastCalledWith(`${API}/search`, expect.anything());
    });
  });

  describe('CI/CD', () => {
    it('lists pipelines with filters', async () => {
      mockClient.get.mockResolvedValue(paged([samplePipeline]));
      const result = await GitLab.actions.listPipelines.handler(
        mockContext,
        parse('listPipelines', {
          projectId: '42',
          status: 'failed',
          ref: 'main',
          orderBy: 'updated_at',
        })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/pipelines`, {
        params: expect.objectContaining({ status: 'failed', ref: 'main', order_by: 'updated_at' }),
      });
      expect(result.values[0]).toEqual(
        expect.objectContaining({
          id: 900,
          status: 'pending',
          startedAt: undefined,
          duration: undefined,
        })
      );
    });

    it('gets, cancels, and retries a pipeline', async () => {
      mockClient.get.mockResolvedValue({ data: samplePipeline });
      await GitLab.actions.getPipeline.handler(
        mockContext,
        parse('getPipeline', { projectId: '42', pipelineId: 900 })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/pipelines/900`);

      mockClient.post.mockResolvedValue({ data: { ...samplePipeline, status: 'canceled' } });
      const canceled = await GitLab.actions.cancelPipeline.handler(
        mockContext,
        parse('cancelPipeline', { projectId: '42', pipelineId: 900 })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/pipelines/900/cancel`);
      expect(canceled.status).toBe('canceled');

      await GitLab.actions.retryPipeline.handler(
        mockContext,
        parse('retryPipeline', { projectId: '42', pipelineId: 900 })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/pipelines/900/retry`);
    });

    it('triggers a pipeline with variables', async () => {
      mockClient.post.mockResolvedValue({ data: samplePipeline });
      const result = await GitLab.actions.triggerPipeline.handler(
        mockContext,
        parse('triggerPipeline', {
          projectId: '42',
          ref: 'main',
          variables: [
            { key: 'DEPLOY_ENV', value: 'staging' },
            { key: 'CONFIG', value: '{}', variableType: 'file' },
          ],
        })
      );
      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/42/pipeline`, {
        ref: 'main',
        variables: [
          { key: 'DEPLOY_ENV', value: 'staging', variable_type: undefined },
          { key: 'CONFIG', value: '{}', variable_type: 'file' },
        ],
      });
      expect(result).toEqual(expect.objectContaining({ id: 900, webUrl: samplePipeline.web_url }));
    });

    it('lists jobs with a repeated scope[] param', async () => {
      mockClient.get.mockResolvedValue(
        paged([
          {
            id: 1,
            name: 'test',
            stage: 'test',
            status: 'failed',
            failure_reason: 'script_failure',
            pipeline: { id: 900 },
            artifacts: [{ file_type: 'trace', filename: 'job.log', size: 10 }],
          },
        ])
      );
      const result = await GitLab.actions.listJobs.handler(
        mockContext,
        parse('listJobs', { projectId: '42', pipelineId: 900, scope: ['failed', 'canceled'] })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/pipelines/900/jobs`, {
        params: {
          scope: ['failed', 'canceled'],
          include_retried: undefined,
          page: undefined,
          per_page: undefined,
        },
        paramsSerializer: { indexes: false },
      });
      expect(result.values[0]).toEqual(
        expect.objectContaining({
          id: 1,
          failureReason: 'script_failure',
          pipelineId: 900,
          artifacts: [{ fileType: 'trace', filename: 'job.log', size: 10 }],
        })
      );
    });

    it('reads a job log keeping the end, and an artifact keeping the start', async () => {
      mockClient.get.mockResolvedValue({ data: 'abcdefghij' });
      const log = await GitLab.actions.getJobArtifact.handler(
        mockContext,
        parse('getJobArtifact', { projectId: '42', jobId: 1, maxLength: 4 })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/42/jobs/1/trace`,
        expect.objectContaining({ responseType: 'text' })
      );
      expect(log).toEqual(
        expect.objectContaining({ kind: 'log', content: 'ghij', truncated: true, totalLength: 10 })
      );

      const artifact = await GitLab.actions.getJobArtifact.handler(
        mockContext,
        parse('getJobArtifact', {
          projectId: '42',
          jobId: 1,
          artifactPath: 'reports/gl sast.json',
          maxLength: 4,
        })
      );
      expect(mockClient.get).toHaveBeenLastCalledWith(
        `${API}/projects/42/jobs/1/artifacts/reports/gl%20sast.json`,
        expect.anything()
      );
      expect(artifact).toEqual(
        expect.objectContaining({ kind: 'artifact', content: 'abcd', truncated: true })
      );
    });

    it('lists pipeline schedules, environments, and deployments', async () => {
      mockClient.get.mockResolvedValue(
        paged([
          { id: 1, description: 'nightly', cron: '0 2 * * *', active: true, owner: sampleUser },
        ])
      );
      const schedules = await GitLab.actions.listPipelineSchedules.handler(
        mockContext,
        parse('listPipelineSchedules', { projectId: '42', scope: 'active' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/pipeline_schedules`, {
        params: { scope: 'active', page: undefined, per_page: undefined },
      });
      expect(schedules.values[0]).toEqual(
        expect.objectContaining({ cron: '0 2 * * *', active: true })
      );

      mockClient.get.mockResolvedValue(
        paged([
          {
            id: 2,
            name: 'production',
            state: 'available',
            last_deployment: { id: 9, status: 'success' },
          },
        ])
      );
      const environments = await GitLab.actions.listEnvironments.handler(
        mockContext,
        parse('listEnvironments', { projectId: '42', states: 'available' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/environments`, {
        params: expect.objectContaining({ states: 'available' }),
      });
      expect(environments.values[0]).toEqual(
        expect.objectContaining({
          name: 'production',
          lastDeployment: expect.objectContaining({ id: 9 }),
        })
      );

      mockClient.get.mockResolvedValue(
        paged([
          {
            id: 3,
            iid: 1,
            status: 'success',
            ref: 'main',
            sha: 'abc',
            environment: { name: 'production' },
            deployable: { id: 77, name: 'deploy', status: 'success', pipeline: { id: 900 } },
          },
        ])
      );
      const deployments = await GitLab.actions.listDeployments.handler(
        mockContext,
        parse('listDeployments', {
          projectId: '42',
          environment: 'production',
          orderBy: 'finished_at',
          sort: 'desc',
        })
      );
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/42/deployments`, {
        params: expect.objectContaining({
          environment: 'production',
          order_by: 'finished_at',
          sort: 'desc',
        }),
      });
      expect(deployments.values[0]).toEqual(
        expect.objectContaining({
          environment: 'production',
          job: expect.objectContaining({ pipelineId: 900 }),
        })
      );
    });
  });

  describe('test handler', () => {
    it('is enabled and reports the instance and user', async () => {
      expect(GitLab.test.enabled).toBe(true);
      mockClient.get.mockResolvedValue({ data: { id: 7, username: 'jdoe' } });
      const result = await GitLab.test.handler(mockContext);
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/user`);
      expect(result).toEqual({ message: 'Connected to https://gitlab.com as jdoe.' });
    });
  });
});
