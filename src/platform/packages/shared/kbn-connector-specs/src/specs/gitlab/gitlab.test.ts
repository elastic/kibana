/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Gitlab } from './gitlab';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();

const mockContext = {
  client: { get: mockGet, post: mockPost, put: mockPut },
  log: {},
  config: { apiUrl: 'https://gitlab.com/api/v4' },
} as unknown as ActionContext;

// Parse raw input through the action's Zod schema so defaults are applied.
const parse = <K extends keyof typeof Gitlab.actions>(action: K, raw: Record<string, unknown>) =>
  Gitlab.actions[action].input.parse(raw);

const mockProject = { id: 123, name: 'kibana', path_with_namespace: 'elastic/kibana' };
const mockIssue = { id: 1001, iid: 42, title: 'Bug', state: 'opened' };
const mockMr = { id: 2001, iid: 15, title: 'Fix bug', state: 'opened' };
const mockUser = { id: 7, username: 'jsmith', name: 'Jane Smith' };

const BASE = 'https://gitlab.com/api/v4';

describe('Gitlab connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: {} });
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
  });

  // =========================================================================
  // Metadata & auth
  // =========================================================================

  describe('metadata', () => {
    it('has the correct connector id', () => {
      expect(Gitlab.metadata.id).toBe('.gitlab');
    });

    it('supports agentBuilder feature', () => {
      expect(Gitlab.metadata.supportedFeatureIds).toContain('agentBuilder');
    });

    it('requires enterprise license', () => {
      expect(Gitlab.metadata.minimumLicense).toBe('enterprise');
    });
  });

  describe('auth', () => {
    it('supports bearer auth labeled as Personal Access Token', () => {
      const bearerType = Gitlab.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'bearer'
      );
      expect(bearerType).toBeDefined();
    });
  });

  // =========================================================================
  // Test handler
  // =========================================================================

  describe('test handler', () => {
    it('calls GET /user and returns empty object on success', async () => {
      const result = await Gitlab.test.handler(mockContext);

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/user`);
      expect(result).toEqual({});
    });
  });

  // =========================================================================
  // Read actions
  // =========================================================================

  describe('getCurrentUser action', () => {
    it('calls GET /user', async () => {
      mockGet.mockResolvedValue({ data: mockUser });

      const result = await Gitlab.actions.getCurrentUser.handler(mockContext, {});

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/user`);
      expect(result).toEqual(mockUser);
    });
  });

  describe('searchProjects action', () => {
    it('applies default pagination and ordering when omitted', async () => {
      mockGet.mockResolvedValue({ data: [mockProject] });
      const input = parse('searchProjects', { search: 'kibana' });

      await Gitlab.actions.searchProjects.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/projects`, {
        params: {
          search: 'kibana',
          page: 1,
          per_page: 20,
          order_by: 'last_activity_at',
          sort: 'desc',
        },
      });
    });

    it('passes custom page and perPage', async () => {
      const input = parse('searchProjects', { search: 'elastic', page: 2, perPage: 50 });
      await Gitlab.actions.searchProjects.handler(mockContext, input);

      expect(mockGet.mock.calls[0][1].params).toMatchObject({ page: 2, per_page: 50 });
    });
  });

  describe('getProject action', () => {
    it('calls GET /projects/:id with URL-encoded project ID', async () => {
      mockGet.mockResolvedValue({ data: mockProject });

      await Gitlab.actions.getProject.handler(mockContext, { projectId: 'elastic/kibana' });

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/projects/elastic%2Fkibana`);
    });

    it('handles numeric project ID without double-encoding', async () => {
      await Gitlab.actions.getProject.handler(mockContext, { projectId: '123' });

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/projects/123`);
    });
  });

  describe('searchUsers action', () => {
    it('calls GET /users with search param', async () => {
      mockGet.mockResolvedValue({ data: [mockUser] });
      const input = parse('searchUsers', { search: 'jsmith' });

      await Gitlab.actions.searchUsers.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/users`, {
        params: { search: 'jsmith', page: 1, per_page: 20 },
      });
    });
  });

  describe('listIssues action', () => {
    it('applies default state and pagination', async () => {
      mockGet.mockResolvedValue({ data: [mockIssue] });
      const input = parse('listIssues', { projectId: '123' });

      await Gitlab.actions.listIssues.handler(mockContext, input);

      const [url, config] = mockGet.mock.calls[0];
      expect(url).toBe(`${BASE}/projects/123/issues`);
      expect(config.params).toMatchObject({ state: 'opened', page: 1, per_page: 20 });
      expect(config.params.labels).toBeUndefined();
      expect(config.params.assignee_username).toBeUndefined();
    });

    it('passes optional label and assignee filters', async () => {
      const input = parse('listIssues', {
        projectId: '123',
        state: 'all',
        labels: 'bug,priority::high',
        assigneeUsername: 'jsmith',
        search: 'crash',
      });

      await Gitlab.actions.listIssues.handler(mockContext, input);

      const config = mockGet.mock.calls[0][1];
      expect(config.params).toMatchObject({
        state: 'all',
        labels: 'bug,priority::high',
        assignee_username: 'jsmith',
        search: 'crash',
      });
    });
  });

  describe('getIssue action', () => {
    it('calls GET /projects/:id/issues/:iid', async () => {
      mockGet.mockResolvedValue({ data: mockIssue });

      await Gitlab.actions.getIssue.handler(mockContext, { projectId: '123', issueIid: '42' });

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/projects/123/issues/42`);
    });
  });

  describe('listMergeRequests action', () => {
    it('applies default state and pagination', async () => {
      mockGet.mockResolvedValue({ data: [mockMr] });
      const input = parse('listMergeRequests', { projectId: 'elastic/kibana' });

      await Gitlab.actions.listMergeRequests.handler(mockContext, input);

      const [url, config] = mockGet.mock.calls[0];
      expect(url).toBe(`${BASE}/projects/elastic%2Fkibana/merge_requests`);
      expect(config.params).toMatchObject({ state: 'opened', page: 1, per_page: 20 });
    });

    it('passes sourceBranch and targetBranch filters', async () => {
      const input = parse('listMergeRequests', {
        projectId: '123',
        sourceBranch: 'feature/x',
        targetBranch: 'main',
      });

      await Gitlab.actions.listMergeRequests.handler(mockContext, input);

      const config = mockGet.mock.calls[0][1];
      expect(config.params).toMatchObject({
        source_branch: 'feature/x',
        target_branch: 'main',
      });
    });
  });

  describe('getMergeRequest action', () => {
    it('calls GET /projects/:id/merge_requests/:iid', async () => {
      mockGet.mockResolvedValue({ data: mockMr });

      await Gitlab.actions.getMergeRequest.handler(mockContext, { projectId: '123', mrIid: '15' });

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/projects/123/merge_requests/15`);
    });
  });

  describe('listBranches action', () => {
    it('calls GET /repository/branches without optional search', async () => {
      const input = parse('listBranches', { projectId: '123' });
      await Gitlab.actions.listBranches.handler(mockContext, input);

      const [url, config] = mockGet.mock.calls[0];
      expect(url).toBe(`${BASE}/projects/123/repository/branches`);
      expect(config.params.search).toBeUndefined();
    });

    it('passes search filter when provided', async () => {
      const input = parse('listBranches', { projectId: '123', search: 'feature' });
      await Gitlab.actions.listBranches.handler(mockContext, input);

      expect(mockGet.mock.calls[0][1].params.search).toBe('feature');
    });
  });

  describe('getFile action', () => {
    it('URL-encodes the file path and defaults ref to HEAD when not provided', async () => {
      const input = parse('getFile', { projectId: '123', filePath: 'src/index.ts' });
      await Gitlab.actions.getFile.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${BASE}/projects/123/repository/files/src%2Findex.ts`, {
        params: { ref: 'HEAD' },
      });
    });

    it('passes ref when provided', async () => {
      await Gitlab.actions.getFile.handler(mockContext, {
        projectId: '123',
        filePath: 'README.md',
        ref: 'main',
      });

      expect(mockGet.mock.calls[0][1].params).toEqual({ ref: 'main' });
    });

    it('URL-encodes deeply nested file paths', async () => {
      await Gitlab.actions.getFile.handler(mockContext, {
        projectId: '123',
        filePath: 'src/components/Button/index.tsx',
      });

      const [url] = mockGet.mock.calls[0];
      expect(url).toBe(
        `${BASE}/projects/123/repository/files/src%2Fcomponents%2FButton%2Findex.tsx`
      );
    });
  });

  describe('listCommits action', () => {
    it('calls commits endpoint with default pagination', async () => {
      const input = parse('listCommits', { projectId: '123' });
      await Gitlab.actions.listCommits.handler(mockContext, input);

      const [url, config] = mockGet.mock.calls[0];
      expect(url).toBe(`${BASE}/projects/123/repository/commits`);
      expect(config.params).toMatchObject({ page: 1, per_page: 20 });
      expect(config.params.ref_name).toBeUndefined();
    });

    it('passes refName, since, and until when provided', async () => {
      const input = parse('listCommits', {
        projectId: '123',
        refName: 'main',
        since: '2024-01-01T00:00:00Z',
        until: '2024-12-31T23:59:59Z',
      });
      await Gitlab.actions.listCommits.handler(mockContext, input);

      expect(mockGet.mock.calls[0][1].params).toMatchObject({
        ref_name: 'main',
        since: '2024-01-01T00:00:00Z',
        until: '2024-12-31T23:59:59Z',
      });
    });
  });

  describe('listPipelines action', () => {
    it('calls pipelines endpoint with default pagination', async () => {
      const input = parse('listPipelines', { projectId: '123' });
      await Gitlab.actions.listPipelines.handler(mockContext, input);

      const [url, config] = mockGet.mock.calls[0];
      expect(url).toBe(`${BASE}/projects/123/pipelines`);
      expect(config.params).toMatchObject({ page: 1, per_page: 20 });
    });

    it('passes ref and status filters', async () => {
      const input = parse('listPipelines', { projectId: '123', ref: 'main', status: 'failed' });
      await Gitlab.actions.listPipelines.handler(mockContext, input);

      expect(mockGet.mock.calls[0][1].params).toMatchObject({ ref: 'main', status: 'failed' });
    });
  });

  // =========================================================================
  // Write actions
  // =========================================================================

  describe('createIssue action', () => {
    it('POSTs to the issues endpoint with title and optional fields', async () => {
      mockPost.mockResolvedValue({ data: mockIssue });

      const result = await Gitlab.actions.createIssue.handler(mockContext, {
        projectId: '123',
        title: 'Bug: crash on startup',
        description: 'Steps to reproduce...',
        labels: 'bug,priority::high',
        assigneeIds: [7],
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE}/projects/123/issues`, {
        title: 'Bug: crash on startup',
        description: 'Steps to reproduce...',
        labels: 'bug,priority::high',
        assignee_ids: [7],
      });
      expect(result).toEqual(mockIssue);
    });

    it('omits optional fields when not provided', async () => {
      await Gitlab.actions.createIssue.handler(mockContext, {
        projectId: '123',
        title: 'Minimal issue',
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE}/projects/123/issues`, {
        title: 'Minimal issue',
      });
    });
  });

  describe('addIssueNote action', () => {
    it('POSTs a note to the issue notes endpoint', async () => {
      mockPost.mockResolvedValue({ data: { id: 100, body: 'LGTM!' } });

      const result = await Gitlab.actions.addIssueNote.handler(mockContext, {
        projectId: '123',
        issueIid: '42',
        body: 'LGTM!',
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE}/projects/123/issues/42/notes`, {
        body: 'LGTM!',
      });
      expect(result).toEqual({ id: 100, body: 'LGTM!' });
    });
  });

  describe('createMergeRequest action', () => {
    it('POSTs to the merge_requests endpoint with required fields', async () => {
      mockPost.mockResolvedValue({ data: mockMr });

      const result = await Gitlab.actions.createMergeRequest.handler(mockContext, {
        projectId: '123',
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        title: 'Add feature X',
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE}/projects/123/merge_requests`, {
        source_branch: 'feature/x',
        target_branch: 'main',
        title: 'Add feature X',
      });
      expect(result).toEqual(mockMr);
    });

    it('includes optional fields when provided', async () => {
      await Gitlab.actions.createMergeRequest.handler(mockContext, {
        projectId: '123',
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        title: 'Add feature X',
        description: 'Implements X',
        assigneeIds: [7],
        labels: 'feature',
        removeSourceBranch: true,
        squash: true,
      });

      const body = mockPost.mock.calls[0][1];
      expect(body).toMatchObject({
        description: 'Implements X',
        assignee_ids: [7],
        labels: 'feature',
        remove_source_branch: true,
        squash: true,
      });
    });
  });

  describe('createBranch action', () => {
    it('POSTs to repository/branches with branch name and ref', async () => {
      mockPost.mockResolvedValue({ data: { name: 'feature/new', commit: { id: 'abc' } } });

      const result = await Gitlab.actions.createBranch.handler(mockContext, {
        projectId: '123',
        branch: 'feature/new',
        ref: 'main',
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE}/projects/123/repository/branches`, {
        branch: 'feature/new',
        ref: 'main',
      });
      expect(result).toEqual({ name: 'feature/new', commit: { id: 'abc' } });
    });
  });

  describe('triggerPipeline action', () => {
    it('POSTs to /pipeline with ref', async () => {
      mockPost.mockResolvedValue({ data: { id: 500, status: 'pending' } });

      const result = await Gitlab.actions.triggerPipeline.handler(mockContext, {
        projectId: '123',
        ref: 'main',
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE}/projects/123/pipeline`, { ref: 'main' });
      expect(result).toEqual({ id: 500, status: 'pending' });
    });

    it('includes variables when provided', async () => {
      await Gitlab.actions.triggerPipeline.handler(mockContext, {
        projectId: '123',
        ref: 'main',
        variables: [
          { key: 'ENV', value: 'staging' },
          { key: 'CONFIG', value: '/etc/app.conf', variableType: 'file' },
        ],
      });

      const body = mockPost.mock.calls[0][1];
      expect(body.variables).toEqual([
        { key: 'ENV', value: 'staging' },
        { key: 'CONFIG', value: '/etc/app.conf', variable_type: 'file' },
      ]);
    });

    it('omits variable_type when not provided', async () => {
      await Gitlab.actions.triggerPipeline.handler(mockContext, {
        projectId: '123',
        ref: 'main',
        variables: [{ key: 'ENV', value: 'prod' }],
      });

      const variable = mockPost.mock.calls[0][1].variables[0];
      expect(variable).not.toHaveProperty('variable_type');
    });
  });

  // =========================================================================
  // Destroy actions
  // =========================================================================

  describe('updateIssue action', () => {
    it('PUTs to the issues endpoint with state_event', async () => {
      mockPut.mockResolvedValue({ data: { ...mockIssue, state: 'closed' } });

      const result = await Gitlab.actions.updateIssue.handler(mockContext, {
        projectId: '123',
        issueIid: '42',
        stateEvent: 'close',
        title: 'Bug: fixed title',
      });

      expect(mockPut).toHaveBeenCalledWith(`${BASE}/projects/123/issues/42`, {
        state_event: 'close',
        title: 'Bug: fixed title',
      });
      expect(result).toMatchObject({ state: 'closed' });
    });

    it('rejects when no update fields are provided', () => {
      expect(() =>
        Gitlab.actions.updateIssue.input.parse({ projectId: '123', issueIid: '42' })
      ).toThrow();
    });

    it('sends assignee_ids when provided', async () => {
      await Gitlab.actions.updateIssue.handler(mockContext, {
        projectId: '123',
        issueIid: '42',
        assigneeIds: [7, 8],
      });

      expect(mockPut.mock.calls[0][1]).toEqual({ assignee_ids: [7, 8] });
    });
  });

  describe('updateMergeRequest action', () => {
    it('PUTs to the merge_requests endpoint', async () => {
      mockPut.mockResolvedValue({ data: { ...mockMr, state: 'closed' } });

      await Gitlab.actions.updateMergeRequest.handler(mockContext, {
        projectId: '123',
        mrIid: '15',
        stateEvent: 'close',
        title: 'Updated title',
      });

      expect(mockPut).toHaveBeenCalledWith(`${BASE}/projects/123/merge_requests/15`, {
        state_event: 'close',
        title: 'Updated title',
      });
    });

    it('rejects when no update fields are provided', () => {
      expect(() =>
        Gitlab.actions.updateMergeRequest.input.parse({ projectId: '123', mrIid: '15' })
      ).toThrow();
    });
  });

  describe('acceptMergeRequest action', () => {
    it('PUTs to the merge_requests/:iid/merge endpoint', async () => {
      mockPut.mockResolvedValue({ data: { ...mockMr, state: 'merged', sha: 'abc123' } });

      const result = await Gitlab.actions.acceptMergeRequest.handler(mockContext, {
        projectId: '123',
        mrIid: '15',
      });

      expect(mockPut).toHaveBeenCalledWith(`${BASE}/projects/123/merge_requests/15/merge`, {});
      expect(result).toMatchObject({ state: 'merged' });
    });

    it('includes optional merge options when provided', async () => {
      await Gitlab.actions.acceptMergeRequest.handler(mockContext, {
        projectId: '123',
        mrIid: '15',
        mergeCommitMessage: 'Merge feature X',
        squash: true,
        shouldRemoveSourceBranch: true,
      });

      expect(mockPut.mock.calls[0][1]).toEqual({
        merge_commit_message: 'Merge feature X',
        squash: true,
        should_remove_source_branch: true,
      });
    });
  });

  describe('addMergeRequestNote action', () => {
    it('POSTs a note to the MR notes endpoint', async () => {
      mockPost.mockResolvedValue({ data: { id: 200, body: 'Looks good!' } });

      const result = await Gitlab.actions.addMergeRequestNote.handler(mockContext, {
        projectId: '123',
        mrIid: '15',
        body: 'Looks good!',
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE}/projects/123/merge_requests/15/notes`, {
        body: 'Looks good!',
      });
      expect(result).toEqual({ id: 200, body: 'Looks good!' });
    });
  });

  describe('requestMergeRequestReview action', () => {
    it('PUTs reviewer_ids to the MR endpoint', async () => {
      mockPut.mockResolvedValue({ data: { ...mockMr, reviewers: [{ id: 7 }] } });

      const result = await Gitlab.actions.requestMergeRequestReview.handler(mockContext, {
        projectId: '123',
        mrIid: '15',
        reviewerIds: [7],
      });

      expect(mockPut).toHaveBeenCalledWith(`${BASE}/projects/123/merge_requests/15`, {
        reviewer_ids: [7],
      });
      expect(result).toMatchObject({ reviewers: [{ id: 7 }] });
    });

    it('rejects when reviewerIds is empty', () => {
      expect(() =>
        Gitlab.actions.requestMergeRequestReview.input.parse({
          projectId: '123',
          mrIid: '15',
          reviewerIds: [],
        })
      ).toThrow();
    });
  });

  describe('createOrUpdateFile action', () => {
    it('POSTs to create a new file when lastCommitId is absent', async () => {
      mockPost.mockResolvedValue({ data: { file_path: 'src/index.ts', branch: 'main' } });

      const result = await Gitlab.actions.createOrUpdateFile.handler(mockContext, {
        projectId: '123',
        filePath: 'src/index.ts',
        branch: 'main',
        content: 'export {};',
        commitMessage: 'Add index.ts',
      });

      expect(mockPost).toHaveBeenCalledWith(
        `${BASE}/projects/123/repository/files/src%2Findex.ts`,
        {
          branch: 'main',
          content: 'export {};',
          commit_message: 'Add index.ts',
          encoding: 'text',
        }
      );
      expect(result).toMatchObject({ file_path: 'src/index.ts' });
    });

    it('PUTs to update an existing file when lastCommitId is provided', async () => {
      mockPut.mockResolvedValue({ data: { file_path: 'README.md', branch: 'main' } });

      await Gitlab.actions.createOrUpdateFile.handler(mockContext, {
        projectId: '123',
        filePath: 'README.md',
        branch: 'main',
        content: '# Updated',
        commitMessage: 'Update README',
        lastCommitId: 'abc123',
      });

      expect(mockPut).toHaveBeenCalledWith(`${BASE}/projects/123/repository/files/README.md`, {
        branch: 'main',
        content: '# Updated',
        commit_message: 'Update README',
        encoding: 'text',
        last_commit_id: 'abc123',
      });
    });

    it('encodes each path segment separately', async () => {
      await Gitlab.actions.createOrUpdateFile.handler(mockContext, {
        projectId: '123',
        filePath: 'src/components/Button.tsx',
        branch: 'main',
        content: '',
        commitMessage: 'Add Button',
      });

      const [url] = mockPost.mock.calls[0];
      expect(url).toBe(
        `${BASE}/projects/123/repository/files/${encodeURIComponent('src/components/Button.tsx')}`
      );
    });

    it('passes base64 encoding when specified', async () => {
      await Gitlab.actions.createOrUpdateFile.handler(mockContext, {
        projectId: '123',
        filePath: 'data.bin',
        branch: 'main',
        content: 'AAEC',
        commitMessage: 'Add binary',
        encoding: 'base64',
      });

      expect(mockPost.mock.calls[0][1].encoding).toBe('base64');
    });
  });

  // =========================================================================
  // Input schema validation
  // =========================================================================

  describe('schema validation', () => {
    it('updateIssue requires at least one update field', () => {
      expect(() =>
        Gitlab.actions.updateIssue.input.parse({ projectId: '123', issueIid: '1' })
      ).toThrow();

      expect(() =>
        Gitlab.actions.updateIssue.input.parse({ projectId: '123', issueIid: '1', title: 'x' })
      ).not.toThrow();
    });

    it('updateMergeRequest requires at least one update field', () => {
      expect(() =>
        Gitlab.actions.updateMergeRequest.input.parse({ projectId: '123', mrIid: '1' })
      ).toThrow();

      expect(() =>
        Gitlab.actions.updateMergeRequest.input.parse({ projectId: '123', mrIid: '1', title: 'x' })
      ).not.toThrow();
    });

    it('listIssues defaults state to opened', () => {
      const input = Gitlab.actions.listIssues.input.parse({ projectId: '123' });
      expect(input.state).toBe('opened');
    });

    it('listMergeRequests defaults state to opened', () => {
      const input = Gitlab.actions.listMergeRequests.input.parse({ projectId: '123' });
      expect(input.state).toBe('opened');
    });

    it('rejects listIssues with invalid state', () => {
      expect(() =>
        Gitlab.actions.listIssues.input.parse({ projectId: '123', state: 'invalid' })
      ).toThrow();
    });

    it('projectId accepts a namespace path string', () => {
      const input = Gitlab.actions.getProject.input.parse({ projectId: 'elastic/kibana' });
      expect(input.projectId).toBe('elastic/kibana');
    });

    it('projectId accepts a numeric string', () => {
      const input = Gitlab.actions.getProject.input.parse({ projectId: '12345' });
      expect(input.projectId).toBe('12345');
    });

    it('issueIid accepts a numeric string', () => {
      const input = Gitlab.actions.getIssue.input.parse({ projectId: '123', issueIid: '42' });
      expect(input.issueIid).toBe('42');
    });

    it('issueIid rejects non-numeric strings', () => {
      expect(() =>
        Gitlab.actions.getIssue.input.parse({ projectId: '123', issueIid: 'abc' })
      ).toThrow();
    });

    it('mrIid rejects non-numeric strings', () => {
      expect(() =>
        Gitlab.actions.getMergeRequest.input.parse({ projectId: '123', mrIid: 'abc' })
      ).toThrow();
    });
  });
});
