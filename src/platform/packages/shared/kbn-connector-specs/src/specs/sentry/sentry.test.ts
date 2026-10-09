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
import { Sentry } from './sentry';
import { SentryBulkUpdateIssuesInputSchema } from './types';

describe('Sentry', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { organizationSlug: 'my-org' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Sentry).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.sentry');
    expect(spec).toBe(Sentry);
    expect(spec?.actions.listIssues).toBeDefined();
    expect(spec?.actions.listIssues.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Sentry.metadata.id).toBe('.sentry');
    expect(Sentry.metadata.displayName).toBe('Sentry');
    expect(Sentry.metadata.minimumLicense).toBe('enterprise');
    expect(Sentry.metadata.supportedFeatureIds).toContain('workflows');
  });

  it('should support bearer auth', () => {
    const types = (Sentry.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('bearer');
  });

  describe('listIssues action', () => {
    it('should default to is:unresolved and org-scoped URL when no project given', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: '1', status: 'unresolved' }] });

      const result = await Sentry.actions.listIssues.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/organizations/my-org/issues/',
        { params: { query: 'is:unresolved' } }
      );
      expect(result).toEqual({
        issues: [expect.objectContaining({ id: '1', status: 'unresolved' })],
      });
    });

    it('should scope to a project when provided', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      await Sentry.actions.listIssues.handler(mockContext, {
        project: 'backend',
        environment: 'prod',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/issues/',
        { params: { query: 'is:unresolved', environment: 'prod' } }
      );
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, data: { detail: 'Invalid token' } },
      });

      await expect(Sentry.actions.listIssues.handler(mockContext, {})).rejects.toThrow(
        'Sentry listIssues failed (status 401): Invalid token'
      );
    });
  });

  describe('getIssue action', () => {
    it('should fetch a single issue by id', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '123', title: 'TypeError' } });

      const result = await Sentry.actions.getIssue.handler(mockContext, { issueId: '123' });

      expect(mockClient.get).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/');
      expect(result).toEqual(expect.objectContaining({ id: '123', title: 'TypeError' }));
    });

    it('should URL-encode an issue ID containing reserved characters', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'a/b#c', title: 'TypeError' } });

      await Sentry.actions.getIssue.handler(mockContext, { issueId: 'a/b#c' });

      expect(mockClient.get).toHaveBeenCalledWith('https://sentry.io/api/0/issues/a%2Fb%23c/');
    });
  });

  describe('resolveIssue action', () => {
    it('should resolve immediately by default', async () => {
      mockClient.put.mockResolvedValue({ data: { id: '123', status: 'resolved' } });

      await Sentry.actions.resolveIssue.handler(mockContext, { issueId: '123' });

      expect(mockClient.put).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/', {
        status: 'resolved',
      });
    });

    it('should resolve in next release when requested', async () => {
      mockClient.put.mockResolvedValue({ data: { id: '123', status: 'resolvedInNextRelease' } });

      await Sentry.actions.resolveIssue.handler(mockContext, {
        issueId: '123',
        inNextRelease: true,
      });

      expect(mockClient.put).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/', {
        status: 'resolvedInNextRelease',
      });
    });
  });

  describe('ignoreIssue action', () => {
    it('should ignore indefinitely by default', async () => {
      mockClient.put.mockResolvedValue({ data: { id: '123', status: 'ignored' } });

      await Sentry.actions.ignoreIssue.handler(mockContext, { issueId: '123' });

      expect(mockClient.put).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/', {
        status: 'ignored',
      });
    });

    it('should pass ignoreDuration when provided', async () => {
      mockClient.put.mockResolvedValue({ data: { id: '123', status: 'ignored' } });

      await Sentry.actions.ignoreIssue.handler(mockContext, { issueId: '123', ignoreDuration: 60 });

      expect(mockClient.put).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/', {
        status: 'ignored',
        statusDetails: { ignoreDuration: 60 },
      });
    });
  });

  describe('unresolveIssue action', () => {
    it('should move the issue back to unresolved', async () => {
      mockClient.put.mockResolvedValue({ data: { id: '123', status: 'unresolved' } });

      await Sentry.actions.unresolveIssue.handler(mockContext, { issueId: '123' });

      expect(mockClient.put).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/', {
        status: 'unresolved',
      });
    });
  });

  describe('assignIssue action', () => {
    it('should assign to a user', async () => {
      mockClient.put.mockResolvedValue({ data: { id: '123', assignedTo: { email: 'a@b.com' } } });

      await Sentry.actions.assignIssue.handler(mockContext, {
        issueId: '123',
        assignedTo: 'a@b.com',
      });

      expect(mockClient.put).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/', {
        assignedTo: 'a@b.com',
      });
    });

    it('should assign to a team', async () => {
      mockClient.put.mockResolvedValue({ data: { id: '123' } });

      await Sentry.actions.assignIssue.handler(mockContext, {
        issueId: '123',
        assignedTo: 'team:backend-team',
      });

      expect(mockClient.put).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/', {
        assignedTo: 'team:backend-team',
      });
    });
  });

  describe('listIssueEvents action', () => {
    it('should list events for an issue', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 'e1' }, { id: 'e2' }] });

      const result = await Sentry.actions.listIssueEvents.handler(mockContext, { issueId: '123' });

      expect(mockClient.get).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/events/', {
        params: {},
      });
      expect(result).toEqual({ events: [{ id: 'e1' }, { id: 'e2' }] });
    });

    it('should pass cursor and full', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      await Sentry.actions.listIssueEvents.handler(mockContext, {
        issueId: '123',
        cursor: 'abc',
        full: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/events/', {
        params: { cursor: 'abc', full: true },
      });
    });
  });

  describe('getEvent action', () => {
    it('should fetch a single event by project and event id', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'e1', tags: [] } });

      const result = await Sentry.actions.getEvent.handler(mockContext, {
        project: 'backend',
        eventId: 'e1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/events/e1/'
      );
      expect(result).toEqual({ id: 'e1', tags: [] });
    });

    it('should URL-encode a project slug and event ID containing reserved characters', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'e/1', tags: [] } });

      await Sentry.actions.getEvent.handler(mockContext, {
        project: 'back end',
        eventId: 'e/1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/back%20end/events/e%2F1/'
      );
    });
  });

  describe('bulkUpdateIssues action', () => {
    it('should reject input with neither status nor assignedTo', () => {
      const result = SentryBulkUpdateIssuesInputSchema.safeParse({
        project: 'backend',
        issueIds: ['1'],
      });

      expect(result.success).toBe(false);
    });

    it('should accept input with only status or only assignedTo', () => {
      expect(
        SentryBulkUpdateIssuesInputSchema.safeParse({
          project: 'backend',
          issueIds: ['1'],
          status: 'resolved',
        }).success
      ).toBe(true);
      expect(
        SentryBulkUpdateIssuesInputSchema.safeParse({
          project: 'backend',
          issueIds: ['1'],
          assignedTo: 'user@example.com',
        }).success
      ).toBe(true);
    });

    it('should update status for multiple issue ids', async () => {
      mockClient.put.mockResolvedValue({ data: { status: 'resolved' } });

      await Sentry.actions.bulkUpdateIssues.handler(mockContext, {
        project: 'backend',
        issueIds: ['1', '2', '3'],
        status: 'resolved',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/issues/',
        { status: 'resolved' },
        { params: { id: ['1', '2', '3'] }, paramsSerializer: { indexes: null } }
      );
    });

    it('should update assignee when provided', async () => {
      mockClient.put.mockResolvedValue({ data: {} });

      await Sentry.actions.bulkUpdateIssues.handler(mockContext, {
        project: 'backend',
        issueIds: ['1'],
        assignedTo: 'me',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/issues/',
        { assignedTo: 'me' },
        { params: { id: ['1'] }, paramsSerializer: { indexes: null } }
      );
    });
  });

  describe('deleteIssue action', () => {
    it('should delete an issue', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      const result = await Sentry.actions.deleteIssue.handler(mockContext, { issueId: '123' });

      expect(mockClient.delete).toHaveBeenCalledWith('https://sentry.io/api/0/issues/123/');
      expect(result).toEqual({ deleted: true, issueId: '123' });
    });

    it('should not be exposed as a tool', () => {
      expect(Sentry.actions.deleteIssue.isTool).toBe(false);
    });
  });

  describe('listProjects action', () => {
    it('should list projects for the organization', async () => {
      mockClient.get.mockResolvedValue({
        data: [{ id: '1', slug: 'backend', name: 'Backend', platform: 'node' }],
      });

      const result = await Sentry.actions.listProjects.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/organizations/my-org/projects/',
        { params: {} }
      );
      expect(result).toEqual({
        projects: [
          { id: '1', slug: 'backend', name: 'Backend', platform: 'node', status: undefined },
        ],
      });
    });

    it('should URL-encode an organization slug containing reserved characters', async () => {
      const contextWithReservedSlug = {
        ...mockContext,
        config: { organizationSlug: 'my org/co' },
      } as unknown as ActionContext;
      mockClient.get.mockResolvedValue({ data: [] });

      await Sentry.actions.listProjects.handler(contextWithReservedSlug, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/organizations/my%20org%2Fco/projects/',
        { params: {} }
      );
    });
  });

  describe('listIssueAlertRules action', () => {
    it('should list rules for a project', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 'r1', name: 'Notify on new issue' }] });

      const result = await Sentry.actions.listIssueAlertRules.handler(mockContext, {
        project: 'backend',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/rules/',
        { params: {} }
      );
      expect(result).toEqual({ rules: [{ id: 'r1', name: 'Notify on new issue' }] });
    });
  });

  describe('createIssueAlertRule action', () => {
    it('should create a rule with default frequency', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'r1' } });

      await Sentry.actions.createIssueAlertRule.handler(mockContext, {
        project: 'backend',
        name: 'Notify on new issue',
        actionMatch: 'all',
        conditions: [{ id: 'sentry.rules.conditions.first_seen_event.FirstSeenEventCondition' }],
        actions: [{ id: 'sentry.rules.actions.notify_event.NotifyEventAction' }],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/rules/',
        {
          name: 'Notify on new issue',
          actionMatch: 'all',
          conditions: [{ id: 'sentry.rules.conditions.first_seen_event.FirstSeenEventCondition' }],
          actions: [{ id: 'sentry.rules.actions.notify_event.NotifyEventAction' }],
          frequency: 30,
        }
      );
    });
  });

  describe('updateIssueAlertRule action', () => {
    it('should backfill unset required fields from the current rule before PUT', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          name: 'Existing rule',
          actionMatch: 'any',
          conditions: [{ id: 'condition-a' }],
          actions: [{ id: 'action-a' }],
          frequency: 30,
        },
      });
      mockClient.put.mockResolvedValue({ data: { id: 'r1', name: 'Updated' } });

      await Sentry.actions.updateIssueAlertRule.handler(mockContext, {
        project: 'backend',
        ruleId: 'r1',
        name: 'Updated',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/rules/r1/'
      );
      expect(mockClient.put).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/rules/r1/',
        {
          name: 'Updated',
          actionMatch: 'any',
          conditions: [{ id: 'condition-a' }],
          actions: [{ id: 'action-a' }],
          frequency: 30,
          filters: undefined,
          filterMatch: undefined,
          environment: undefined,
          owner: undefined,
        }
      );
    });

    it('should preserve filters, filterMatch, environment, and owner on a partial update', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          name: 'Existing rule',
          actionMatch: 'any',
          conditions: [{ id: 'condition-a' }],
          actions: [{ id: 'action-a' }],
          frequency: 30,
          filters: [{ id: 'sentry.rules.filters.age_comparison.AgeComparisonFilter' }],
          filterMatch: 'all',
          environment: 'production',
          owner: 'team:1',
        },
      });
      mockClient.put.mockResolvedValue({ data: { id: 'r1' } });

      await Sentry.actions.updateIssueAlertRule.handler(mockContext, {
        project: 'backend',
        ruleId: 'r1',
        frequency: 60,
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://sentry.io/api/0/projects/my-org/backend/rules/r1/',
        expect.objectContaining({
          frequency: 60,
          filters: [{ id: 'sentry.rules.filters.age_comparison.AgeComparisonFilter' }],
          filterMatch: 'all',
          environment: 'production',
          owner: 'team:1',
        })
      );
    });

    it('should throw a formatted error when the current rule cannot be fetched', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 404, data: { detail: 'Rule not found' } },
      });

      await expect(
        Sentry.actions.updateIssueAlertRule.handler(mockContext, {
          project: 'backend',
          ruleId: 'r1',
          name: 'Updated',
        })
      ).rejects.toThrow('Sentry updateIssueAlertRule failed (status 404): Rule not found');
    });

    it('should URL-encode a project slug and rule ID containing reserved characters', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          name: 'Existing rule',
          actionMatch: 'any',
          conditions: [],
          actions: [],
        },
      });
      mockClient.put.mockResolvedValue({ data: { id: 'r#1' } });

      await Sentry.actions.updateIssueAlertRule.handler(mockContext, {
        project: 'back end',
        ruleId: 'r#1',
        name: 'Updated',
      });

      const expectedUrl = 'https://sentry.io/api/0/projects/my-org/back%20end/rules/r%231/';
      expect(mockClient.get).toHaveBeenCalledWith(expectedUrl);
      expect(mockClient.put).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('test handler', () => {
    it('should succeed when projects can be listed', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: '1' }, { id: '2' }] });

      const result = await Sentry.test.handler(mockContext);

      expect(result.message).toContain('my-org');
      expect(result.message).toContain('2');
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 403, data: { detail: 'Forbidden' } },
      });

      if (!Sentry.test) throw new Error('Test handler not defined');
      await expect(Sentry.test.handler(mockContext)).rejects.toThrow(
        'Sentry test failed (status 403): Forbidden'
      );
    });
  });
});
