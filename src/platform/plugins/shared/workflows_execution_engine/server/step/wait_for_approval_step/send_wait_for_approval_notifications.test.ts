/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildWaitForApprovalResumeLinks,
  hasExternalApprovalChannels,
  sendWaitForApprovalNotifications,
} from './send_wait_for_approval_notifications';

describe('send_wait_for_approval_notifications', () => {
  describe('hasExternalApprovalChannels', () => {
    it('returns false when channels are omitted', () => {
      expect(hasExternalApprovalChannels(undefined)).toBe(false);
    });

    it('returns true when slack channel config is present', () => {
      expect(
        hasExternalApprovalChannels({
          slack: { 'connector-id': 'slack-1', channel: '#approvals' },
        })
      ).toBe(true);
    });

    it('returns true when slack_api channel config is present', () => {
      expect(
        hasExternalApprovalChannels({
          slack_api: { 'connector-id': 'slack-api-1', channels: ['C0123'] },
        })
      ).toBe(true);
    });
  });

  describe('buildWaitForApprovalResumeLinks', () => {
    it('builds approve and reject URLs with signed tokens', () => {
      const links = buildWaitForApprovalResumeLinks({
        kibanaUrl: 'https://kibana.example',
        spaceId: 'default',
        executionId: 'exec-1',
        stepId: 'request-approval',
        timeout: '1h',
        signingKey: 'test-signing-key-with-at-least-32-characters',
      });

      expect(links.approveUrl).toContain('approved=true');
      expect(links.rejectUrl).toContain('approved=false');
      expect(links.approveUrl).toContain('token=');
      expect(links.rejectUrl).toContain('token=');
    });
  });

  describe('sendWaitForApprovalNotifications', () => {
    const resumeLinks = {
      approveUrl: 'https://kibana.example/approve',
      rejectUrl: 'https://kibana.example/reject',
    };

    it('sends slack and slack_api notifications when both are configured', async () => {
      const execute = jest
        .fn()
        .mockResolvedValueOnce({ status: 'ok' })
        .mockResolvedValueOnce({ status: 'ok' });

      await sendWaitForApprovalNotifications({
        channels: {
          slack: { 'connector-id': 'slack-1', channel: '#approvals' },
          slack_api: { 'connector-id': 'slack-api-1', channels: ['C0123'] },
        },
        message: 'Approve change?',
        approveLabel: 'Approve',
        rejectLabel: 'Decline',
        resumeLinks,
        connectorExecutor: { execute } as never,
        abortController: new AbortController(),
      });

      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute.mock.calls[0][0].connectorType).toBe('slack');
      expect(execute.mock.calls[0][0].input.message).toContain(
        '<https://kibana.example/approve|Approve>'
      );
      expect(execute.mock.calls[1][0].connectorType).toBe('slack_api');
      expect(execute.mock.calls[1][0].input.subAction).toBe('postMessage');
    });

    it('throws when a configured connector fails', async () => {
      const execute = jest
        .fn()
        .mockResolvedValue({ status: 'error', message: 'Slack unavailable' });

      await expect(
        sendWaitForApprovalNotifications({
          channels: {
            slack: { 'connector-id': 'slack-1', channel: '#approvals' },
          },
          message: 'Approve change?',
          approveLabel: 'Approve',
          rejectLabel: 'Decline',
          resumeLinks,
          connectorExecutor: { execute } as never,
          abortController: new AbortController(),
        })
      ).rejects.toThrow('Slack unavailable');
    });
  });
});
