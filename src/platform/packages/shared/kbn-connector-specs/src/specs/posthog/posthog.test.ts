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
import { PostHog } from './posthog';

describe('PostHog', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { instanceHost: 'https://us.posthog.com', projectId: '123' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const BASE = 'https://us.posthog.com/api/projects/123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(PostHog).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.posthog');
    expect(spec).toBe(PostHog);
    expect(spec?.actions.listIssues).toBeDefined();
    expect(spec?.actions.listIssues.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(PostHog.metadata.id).toBe('.posthog');
    expect(PostHog.metadata.displayName).toBe('PostHog');
    expect(PostHog.metadata.minimumLicense).toBe('enterprise');
  });

  it('should support bearer auth', () => {
    const types = (PostHog.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('bearer');
  });

  it('should throw when instanceHost or projectId config is missing', async () => {
    const badContext = { ...mockContext, config: {} } as unknown as ActionContext;
    await expect(PostHog.actions.listIssues.handler(badContext, { limit: 20 })).rejects.toThrow(
      'instanceHost'
    );
  });

  describe('listIssues action', () => {
    it('should list issues with filters via the query endpoint', async () => {
      mockClient.post.mockResolvedValue({
        data: { results: [{ id: 'i1', status: 'active' }], hasMore: false },
      });

      const result = await PostHog.actions.listIssues.handler(mockContext, {
        status: 'active',
        assigneeId: 'u1',
        assigneeType: 'user',
        dateFrom: '-7d',
        limit: 20,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE}/error_tracking/query/issues/`,
        expect.objectContaining({
          status: 'active',
          assignee: { id: 'u1', type: 'user' },
          dateRange: { date_from: '-7d', date_to: undefined },
          limit: 20,
        })
      );
      expect(result).toEqual({ results: [{ id: 'i1', status: 'active' }], hasMore: false });
    });

    it('should omit the status filter when "all" is selected, instead of sending it literally', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [], hasMore: false } });

      await PostHog.actions.listIssues.handler(mockContext, {
        status: 'all',
        limit: 20,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE}/error_tracking/query/issues/`,
        expect.objectContaining({ status: undefined })
      );
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.post.mockRejectedValue({
        response: { status: 401, data: { detail: 'Invalid API key' } },
        message: 'Request failed',
      });

      await expect(PostHog.actions.listIssues.handler(mockContext, { limit: 20 })).rejects.toThrow(
        'PostHog listIssues failed (status 401): Invalid API key'
      );
    });
  });

  describe('getIssue action', () => {
    it('should fetch a single issue', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'i1', status: 'active' } });

      const result = await PostHog.actions.getIssue.handler(mockContext, { issueId: 'i1' });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE}/error_tracking/issues/i1/`);
      expect(result).toEqual({ id: 'i1', status: 'active' });
    });

    it('should URL-encode the issueId path segment', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await PostHog.actions.getIssue.handler(mockContext, { issueId: 'i1/../secret?x=1' });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${BASE}/error_tracking/issues/i1%2F..%2Fsecret%3Fx%3D1/`
      );
    });
  });

  describe('updateIssueStatus action', () => {
    it('should PATCH the new status', async () => {
      mockClient.patch.mockResolvedValue({ data: { id: 'i1', status: 'resolved' } });

      const result = await PostHog.actions.updateIssueStatus.handler(mockContext, {
        issueId: 'i1',
        status: 'resolved',
      });

      expect(mockClient.patch).toHaveBeenCalledWith(`${BASE}/error_tracking/issues/i1/`, {
        status: 'resolved',
      });
      expect(result).toEqual({ id: 'i1', status: 'resolved' });
    });
  });

  describe('assignIssue action', () => {
    it('should PATCH the assignee', async () => {
      mockClient.patch.mockResolvedValue({
        data: { id: 'i1', assignee: { id: 'u1', type: 'user' } },
      });

      const result = await PostHog.actions.assignIssue.handler(mockContext, {
        issueId: 'i1',
        assigneeId: 'u1',
        assigneeType: 'user',
      });

      expect(mockClient.patch).toHaveBeenCalledWith(`${BASE}/error_tracking/issues/i1/assign/`, {
        assignee: { id: 'u1', type: 'user' },
      });
      expect(result).toEqual({ id: 'i1', assignee: { id: 'u1', type: 'user' } });
    });
  });

  describe('runQuery action', () => {
    it('should POST a HogQLQuery', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [[42]] } });

      const result = await PostHog.actions.runQuery.handler(mockContext, {
        query: 'select count() from events',
        name: 'count events',
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${BASE}/query/`, {
        query: { kind: 'HogQLQuery', query: 'select count() from events' },
        name: 'count events',
      });
      expect(result).toEqual({ results: [[42]] });
    });
  });

  describe('feature flag actions', () => {
    it('updateFeatureFlag should send active and rollout percentage when the flag has no existing groups', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 1, filters: {} } });
      mockClient.patch.mockResolvedValue({ data: { id: 1, active: false } });

      const result = await PostHog.actions.updateFeatureFlag.handler(mockContext, {
        flagId: 1,
        active: false,
        rolloutPercentage: 25,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE}/feature_flags/1/`);
      expect(mockClient.patch).toHaveBeenCalledWith(`${BASE}/feature_flags/1/`, {
        active: false,
        filters: { groups: [{ properties: [], rollout_percentage: 25 }] },
      });
      expect(result).toEqual({ id: 1, active: false });
    });

    it('updateFeatureFlag should preserve existing group targeting properties when changing rollout percentage', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          id: 1,
          filters: {
            groups: [
              {
                properties: [{ key: 'email', value: '@elastic.co', operator: 'icontains' }],
                rollout_percentage: 100,
              },
              { properties: [], rollout_percentage: 10 },
            ],
          },
        },
      });
      mockClient.patch.mockResolvedValue({ data: { id: 1 } });

      await PostHog.actions.updateFeatureFlag.handler(mockContext, {
        flagId: 1,
        rolloutPercentage: 25,
      });

      expect(mockClient.patch).toHaveBeenCalledWith(`${BASE}/feature_flags/1/`, {
        filters: {
          groups: [
            {
              properties: [{ key: 'email', value: '@elastic.co', operator: 'icontains' }],
              rollout_percentage: 25,
            },
            { properties: [], rollout_percentage: 25 },
          ],
        },
      });
    });

    it('updateFeatureFlag should send only active when rollout not provided', async () => {
      mockClient.patch.mockResolvedValue({ data: { id: 1, active: true } });

      await PostHog.actions.updateFeatureFlag.handler(mockContext, { flagId: 1, active: true });

      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.patch).toHaveBeenCalledWith(`${BASE}/feature_flags/1/`, { active: true });
    });

    it('getFeatureFlag should fetch a flag by id', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 1, key: 'new-checkout' } });

      const result = await PostHog.actions.getFeatureFlag.handler(mockContext, { flagId: 1 });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE}/feature_flags/1/`);
      expect(result).toEqual({ id: 1, key: 'new-checkout' });
    });

    it('listFeatureFlags should list with a search filter', async () => {
      mockClient.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });

      const result = await PostHog.actions.listFeatureFlags.handler(mockContext, {
        search: 'checkout',
        limit: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE}/feature_flags/`, {
        params: { search: 'checkout', limit: 50 },
      });
      expect(result).toEqual({ results: [{ id: 1 }] });
    });
  });

  describe('createAnnotation action', () => {
    it('should POST the annotation content and date marker', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 1, content: 'Deployed v1' } });

      const result = await PostHog.actions.createAnnotation.handler(mockContext, {
        content: 'Deployed v1',
        dateMarker: '2024-06-01T00:00:00Z',
        scope: 'project',
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${BASE}/annotations/`, {
        content: 'Deployed v1',
        date_marker: '2024-06-01T00:00:00Z',
        scope: 'project',
      });
      expect(result).toEqual({ id: 1, content: 'Deployed v1' });
    });
  });

  describe('listSessionRecordings action', () => {
    it('should list recordings within a time window', async () => {
      mockClient.get.mockResolvedValue({ data: { results: [{ id: 'rec1' }] } });

      const result = await PostHog.actions.listSessionRecordings.handler(mockContext, {
        dateFrom: '-7d',
        limit: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE}/session_recordings/`, {
        params: expect.objectContaining({ date_from: '-7d', limit: 20 }),
      });
      expect(result).toEqual({ results: [{ id: 'rec1' }] });
    });
  });

  describe('createExternalReference action', () => {
    it('should link an issue to an external ticket', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'ref1', issue: 'i1' } });

      const result = await PostHog.actions.createExternalReference.handler(mockContext, {
        issueId: 'i1',
        integrationId: 5,
        externalUrl: 'https://github.com/org/repo/issues/42',
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${BASE}/error_tracking/external_references/`, {
        issue: 'i1',
        integration_id: 5,
        config: { external_url: 'https://github.com/org/repo/issues/42' },
      });
      expect(result).toEqual({ id: 'ref1', issue: 'i1' });
    });
  });

  describe('test handler', () => {
    it('should succeed when issues can be listed', async () => {
      mockClient.get.mockResolvedValue({ data: { results: [] } });

      if (!PostHog.test) throw new Error('Test handler not defined');
      const result = await PostHog.test.handler(mockContext);

      expect(result).toEqual({ message: 'Successfully connected to the PostHog API.' });
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 403, data: { detail: 'Forbidden' } },
        message: 'Request failed',
      });

      if (!PostHog.test) throw new Error('Test handler not defined');
      await expect(PostHog.test.handler(mockContext)).rejects.toThrow(
        'PostHog test failed (status 403): Forbidden'
      );
    });
  });
});
