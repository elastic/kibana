/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { SublimeSecurityConnector } from './sublime_security';
import { SearchMessageGroupsInputSchema } from './types';
import type { SublimeMessageGroupSummary } from './types';

const BASE_URL = 'https://platform.sublime.security';

describe('SublimeSecurityConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  const mockContext = {
    client: mockClient,
    config: { baseUrl: BASE_URL },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id, license, and feature ids', () => {
      expect(SublimeSecurityConnector.metadata.id).toBe('.sublime_security');
      expect(SublimeSecurityConnector.metadata.displayName).toBe('Sublime Security');
      expect(SublimeSecurityConnector.metadata.minimumLicense).toBe('enterprise');
      expect(SublimeSecurityConnector.metadata.isTechnicalPreview).toBe(true);
      expect(SublimeSecurityConnector.metadata.supportedFeatureIds).toEqual([
        'workflows',
        'agentBuilder',
      ]);
    });
  });

  describe('auth', () => {
    it('uses bearer auth relabeled as API key', () => {
      const authTypes = SublimeSecurityConnector.auth?.types;
      expect(authTypes).toHaveLength(1);
      const authDef = authTypes?.[0] as { type: string };
      expect(authDef.type).toBe('bearer');
    });

    it('sets a User-Agent header', () => {
      expect(SublimeSecurityConnector.auth?.headers).toEqual({ 'User-Agent': 'ElasticKibana' });
    });
  });

  describe('schema', () => {
    it('exposes only baseUrl in config, with allowedHosts validation', () => {
      const { shape } = SublimeSecurityConnector.schema as unknown as {
        shape: Record<string, { meta: () => { validate?: unknown } | undefined }>;
      };
      expect(Object.keys(shape)).toEqual(['baseUrl']);
      expect(shape.baseUrl.meta()?.validate).toEqual({ allowedHosts: true });
    });
  });

  describe('isTool exposure', () => {
    it('exposes reads as tools and keeps mutations workflow-only', () => {
      const { actions } = SublimeSecurityConnector;
      expect(actions.searchMessageGroups.isTool).toBe(true);
      expect(actions.getMessageGroup.isTool).toBe(true);
      expect(actions.getMessage.isTool).toBe(true);
      expect(actions.getAttackScore.isTool).toBe(true);
      expect(actions.getAsaVerdict.isTool).toBe(true);
      expect(actions.getTask.isTool).toBe(true);
      expect(actions.listMailboxes.isTool).toBe(true);
      expect(actions.quarantineMessageGroups.isTool).toBe(false);
      expect(actions.trashMessageGroups.isTool).toBe(false);
      expect(actions.restoreMessageGroups.isTool).toBe(false);
    });
  });

  describe('searchMessageGroups', () => {
    const rawGroup = {
      id: 'grp-1',
      state: 'flagged',
      classification: null,
      review_status: 'open',
      review_label: null,
      review_comment: null,
      organization_id: 'org-1',
      flagged_rules: [{ id: 'rule-1', name: 'Credential phishing', tags: ['phishing'] }],
      messages: Array.from({ length: 7 }, (_, i) => ({
        id: `msg-${i}`,
        subject: 'Urgent: reset your password',
        sender: { email: 'attacker@evil.example', display_name: 'IT Support' },
        created_at: '2026-07-14T15:09:26Z',
        mailbox: { id: 'mbx-1', email: `user${i}@corp.example` },
        recipients: [{ email: `user${i}@corp.example` }],
        read_at: null,
      })),
      user_reports: [{ id: 'rep-1' }],
      message_links_clicked: [],
    };

    it('maps camelCase inputs to the Sublime query params', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { total: 1, count: 1, message_groups: [rawGroup] },
      });

      await SublimeSecurityConnector.actions.searchMessageGroups.handler(mockContext, {
        flagged: true,
        senderDomain: 'evil.example',
        attackScoreVerdict: 'malicious',
        createdAtGte: '2026-07-01T00:00:00Z',
        limit: 50,
        offset: 0,
      });

      // Built via member assignments: the `__is`/`__gte` keys trip the
      // object-literal naming-convention lint rule.
      const expectedParams: Record<string, unknown> = { flagged: true, limit: 50, offset: 0 };
      expectedParams.sender_domain__is = 'evil.example';
      expectedParams.attack_score_verdict__is = 'malicious';
      expectedParams.created_at__gte = '2026-07-01T00:00:00Z';

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/message-groups`, {
        params: expect.objectContaining(expectedParams),
      });
    });

    it('maps mailboxEmail to the mailbox_email__is query param', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { total: 0, count: 0, message_groups: [] },
      });

      await SublimeSecurityConnector.actions.searchMessageGroups.handler(mockContext, {
        mailboxEmail: 'user@corp.example',
        limit: 20,
        offset: 0,
      });

      const [, options] = (mockClient.get as jest.Mock).mock.calls[0];
      expect(options.params.mailbox_email__is).toBe('user@corp.example');
    });

    it('rejects flagged: false unless userReported is true', () => {
      const base = { limit: 20, offset: 0 };

      expect(SearchMessageGroupsInputSchema.safeParse({ ...base, flagged: false }).success).toBe(
        false
      );
      expect(
        SearchMessageGroupsInputSchema.safeParse({ ...base, flagged: false, userReported: false })
          .success
      ).toBe(false);
      expect(
        SearchMessageGroupsInputSchema.safeParse({ ...base, flagged: false, userReported: true })
          .success
      ).toBe(true);
      expect(SearchMessageGroupsInputSchema.safeParse(base).success).toBe(true);
    });

    it('preserves stats_limit_exceeded so callers can page past a lower-bound total', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { total: 10000, count: 20, stats_limit_exceeded: true, message_groups: [] },
      });

      const result = (await SublimeSecurityConnector.actions.searchMessageGroups.handler(
        mockContext,
        { limit: 20, offset: 0 }
      )) as { total: number; stats_limit_exceeded?: boolean };

      expect(result.total).toBe(10000);
      expect(result.stats_limit_exceeded).toBe(true);
    });

    it('trims groups to summaries with at most 5 sample messages and no organization_id', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { total: 1, count: 1, message_groups: [rawGroup] },
      });

      const result = (await SublimeSecurityConnector.actions.searchMessageGroups.handler(
        mockContext,
        { limit: 20, offset: 0 }
      )) as {
        total: number;
        message_groups: Array<
          SublimeMessageGroupSummary & { organization_id?: unknown; user_reports?: unknown }
        >;
      };

      expect(result.total).toBe(1);
      const group = result.message_groups[0];
      expect(group.id).toBe('grp-1');
      expect(group.message_count).toBe(7);
      expect(group.messages).toHaveLength(5);
      expect(group.messages[0]).toEqual(
        expect.objectContaining({
          id: 'msg-0',
          subject: 'Urgent: reset your password',
          mailbox_email: 'user0@corp.example',
        })
      );
      expect(group.flagged_rules).toEqual([{ id: 'rule-1', name: 'Credential phishing' }]);
      expect(group.organization_id).toBeUndefined();
      expect(group.user_reports).toBeUndefined();
    });

    it('defaults flagged=true and a 30-day time anchor when neither is provided', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { total: 0, count: 0, message_groups: [] },
      });

      await SublimeSecurityConnector.actions.searchMessageGroups.handler(mockContext, {
        limit: 20,
        offset: 0,
      });

      const [, options] = (mockClient.get as jest.Mock).mock.calls[0];
      expect(options.params.flagged).toBe(true);
      expect(options.params.created_at__gte).toEqual(expect.any(String));
      expect(new Date(options.params.created_at__gte).getTime()).toBeLessThan(Date.now());
    });

    it('does not force flagged when userReported is set', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { total: 0, count: 0, message_groups: [] },
      });

      await SublimeSecurityConnector.actions.searchMessageGroups.handler(mockContext, {
        userReported: true,
        limit: 20,
        offset: 0,
      });

      const [, options] = (mockClient.get as jest.Mock).mock.calls[0];
      expect(options.params.flagged).toBeUndefined();
      expect(options.params.user_reported).toBe(true);
    });

    it('surfaces the vendor error payload and request id', async () => {
      (mockClient.get as jest.Mock).mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'invalid api key' },
          headers: { 'x-request-id': 'req-123' },
        },
      });

      await expect(
        SublimeSecurityConnector.actions.searchMessageGroups.handler(mockContext, {
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow(
        'Sublime Security API error (401): {"message":"invalid api key"} (request id: req-123)'
      );
    });
  });

  describe('getMessageGroup', () => {
    it('encodes the id and returns counts for reports and link clicks', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: {
          id: 'grp/1',
          state: 'flagged',
          flagged_rules: [],
          messages: [],
          user_reports: [{ id: 'r1' }, { id: 'r2' }],
          message_links_clicked: [{ id: 'c1' }],
        },
      });

      const result = (await SublimeSecurityConnector.actions.getMessageGroup.handler(mockContext, {
        messageGroupId: 'grp/1',
      })) as { user_report_count: number; link_click_count: number };

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/message-groups/grp%2F1`);
      expect(result.user_report_count).toBe(2);
      expect(result.link_click_count).toBe(1);
    });
  });

  describe('getMessage', () => {
    it('returns selected metadata fields only', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: {
          id: 'msg-1',
          canonical_id: 'canon-1',
          subject: 'Invoice attached',
          sender: { email: 'attacker@evil.example' },
          mailbox: { id: 'mbx-1', email: 'user@corp.example' },
          created_at: '2026-07-14T15:09:26Z',
          landed_in_spam: false,
          message_source_id: 'src-1',
        },
      });

      const result = (await SublimeSecurityConnector.actions.getMessage.handler(mockContext, {
        messageId: 'msg-1',
      })) as Record<string, unknown>;

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/messages/msg-1`);
      expect(result.id).toBe('msg-1');
      expect(result.mailbox_email).toBe('user@corp.example');
      expect(result.message_source_id).toBeUndefined();
    });

    it('reconstructs sender explicitly instead of passing it through raw', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: {
          id: 'msg-1',
          sender: {
            email: 'attacker@evil.example',
            display_name: 'IT Support',
            internal_routing: 'x',
          },
        },
      });

      const result = (await SublimeSecurityConnector.actions.getMessage.handler(mockContext, {
        messageId: 'msg-1',
      })) as { sender?: Record<string, unknown> };

      expect(result.sender).toEqual({
        email: 'attacker@evil.example',
        display_name: 'IT Support',
      });
    });
  });

  describe('getAttackScore', () => {
    it('returns score, verdict, and trimmed top signals', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: {
          score: 97.2,
          verdict: 'malicious',
          graymail_score: 1.1,
          top_signals: [
            { category: 'sender', description: 'First-time sender', rank: 1, internal: 'x' },
          ],
        },
      });

      const result = await SublimeSecurityConnector.actions.getAttackScore.handler(mockContext, {
        messageId: 'msg-1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/messages/msg-1/attack_score`);
      expect(result).toEqual({
        score: 97.2,
        verdict: 'malicious',
        graymail_score: 1.1,
        top_signals: [{ category: 'sender', description: 'First-time sender', rank: 1 }],
      });
    });
  });

  describe('getAsaVerdict', () => {
    it('returns the verdict when ASA has triaged the message', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({ data: { verdict: 'malicious' } });

      const result = await SublimeSecurityConnector.actions.getAsaVerdict.handler(mockContext, {
        messageId: 'msg-1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/messages/msg-1/asa_verdict`);
      expect(result).toEqual({ triaged: true, verdict: 'malicious' });
    });

    it('returns triaged: false instead of throwing on 404', async () => {
      (mockClient.get as jest.Mock).mockRejectedValue({
        response: { status: 404, data: { error: { type: 'not_found' } }, headers: {} },
      });

      const result = await SublimeSecurityConnector.actions.getAsaVerdict.handler(mockContext, {
        messageId: 'msg-1',
      });

      expect(result).toEqual({ triaged: false, verdict: null });
    });

    it('still throws on non-404 errors', async () => {
      (mockClient.get as jest.Mock).mockRejectedValue({
        response: { status: 500, data: 'boom', headers: {} },
      });

      await expect(
        SublimeSecurityConnector.actions.getAsaVerdict.handler(mockContext, { messageId: 'msg-1' })
      ).rejects.toThrow('Sublime Security API error (500): boom');
    });
  });

  describe.each([
    ['quarantineMessageGroups', 'quarantine'],
    ['trashMessageGroups', 'trash'],
    ['restoreMessageGroups', 'restore'],
  ] as const)('%s', (actionName, apiPath) => {
    it('posts the bulk body and returns the task id', async () => {
      (mockClient.post as jest.Mock).mockResolvedValue({ data: { task_id: 'task-9' } });

      const result = await SublimeSecurityConnector.actions[actionName].handler(mockContext, {
        messageGroupIds: ['grp-1', 'grp-2'],
        classification: 'malicious',
        reviewComment: 'Quarantined by Elastic Workflows',
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${BASE_URL}/v0/message-groups/${apiPath}`, {
        message_group_ids: ['grp-1', 'grp-2'],
        classification: 'malicious',
        review_comment: 'Quarantined by Elastic Workflows',
      });
      expect(result).toEqual({ task_id: 'task-9' });
    });

    it('omits optional fields that are not provided', async () => {
      (mockClient.post as jest.Mock).mockResolvedValue({ data: { task_id: 'task-10' } });

      await SublimeSecurityConnector.actions[actionName].handler(mockContext, {
        messageGroupIds: ['grp-1'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${BASE_URL}/v0/message-groups/${apiPath}`, {
        message_group_ids: ['grp-1'],
      });
    });
  });

  describe('listMailboxes', () => {
    it('lists mailboxes with trimmed fields', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: {
          total: 2,
          count: 2,
          active: 1,
          mailboxes: [
            {
              id: 'mbx-1',
              email_address: 'user@corp.example',
              active: true,
              subscription_error_status: '',
              internal_field: 'x',
            },
            { id: 'mbx-2', email_address: 'shared@corp.example', active: false },
          ],
        },
      });

      const result = (await SublimeSecurityConnector.actions.listMailboxes.handler(mockContext, {
        search: 'corp',
        limit: 20,
        offset: 0,
      })) as { total: number; mailboxes: Array<Record<string, unknown>> };

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/mailboxes`, {
        params: { active: undefined, search: 'corp', limit: 20, offset: 0 },
      });
      expect(result.total).toBe(2);
      expect(result.mailboxes[0]).toEqual({
        id: 'mbx-1',
        email_address: 'user@corp.example',
        active: true,
        subscription_error_status: '',
      });
      expect(result.mailboxes[0].internal_field).toBeUndefined();
    });
  });

  describe('getTask', () => {
    it('returns the task state', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { id: 'task-9', state: 'succeeded', created_at: '2026-07-14T15:09:26Z' },
      });

      const result = await SublimeSecurityConnector.actions.getTask.handler(mockContext, {
        taskId: 'task-9',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/tasks/task-9`);
      expect(result).toEqual({
        id: 'task-9',
        state: 'succeeded',
        error: undefined,
        created_at: '2026-07-14T15:09:26Z',
      });
    });

    it('fails when the task response is missing id or state', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { id: 'task-9' },
      });

      await expect(
        SublimeSecurityConnector.actions.getTask.handler(mockContext, { taskId: 'task-9' })
      ).rejects.toThrow('unexpected task response for task task-9: missing state');

      (mockClient.get as jest.Mock).mockResolvedValue({
        data: { state: 'succeeded' },
      });

      await expect(
        SublimeSecurityConnector.actions.getTask.handler(mockContext, { taskId: 'task-9' })
      ).rejects.toThrow('unexpected task response for task task-9: missing id');
    });
  });

  describe('base URL handling', () => {
    it('trims trailing slashes from the configured base URL', async () => {
      const slashContext = {
        ...mockContext,
        config: { baseUrl: `${BASE_URL}///` },
      } as unknown as ActionContext;
      (mockClient.get as jest.Mock).mockResolvedValue({ data: { id: 'task-9', state: 'pending' } });

      await SublimeSecurityConnector.actions.getTask.handler(slashContext, { taskId: 'task-9' });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/tasks/task-9`);
    });
  });

  describe('test handler', () => {
    const testDef = SublimeSecurityConnector.test;
    if (!testDef) {
      throw new Error('expected the Sublime Security spec to define a test handler');
    }

    it('is enabled and lists one mailbox on success', async () => {
      expect(testDef.enabled).toBe(true);
      (mockClient.get as jest.Mock).mockResolvedValue({ data: { mailboxes: [], total: 0 } });

      const result = await testDef.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v0/mailboxes`, {
        params: { limit: 1 },
      });
      expect(result).toEqual(expect.objectContaining({ ok: true, message: expect.any(String) }));
    });

    it('throws on failure', async () => {
      (mockClient.get as jest.Mock).mockRejectedValue({
        response: { status: 401, data: 'unauthorized', headers: {} },
      });

      await expect(testDef.handler(mockContext)).rejects.toThrow(
        'Sublime Security API error (401): unauthorized'
      );
    });
  });
});
