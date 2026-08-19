/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasExternalHitlChannels } from './has_external_hitl_channels';
import {
  buildWaitForApprovalResumeLinks,
  sendWaitForApprovalNotifications,
} from './send_wait_for_approval_notifications';

describe('send_wait_for_approval_notifications', () => {
  describe('hasExternalHitlChannels', () => {
    it('returns false when channels are omitted', () => {
      expect(hasExternalHitlChannels(undefined)).toBe(false);
    });

    it('returns true when slack webhook connector config is present', () => {
      expect(
        hasExternalHitlChannels({
          slack: { 'connector-id': 'slack-1' },
        })
      ).toBe(true);
    });

    it('returns true when slack_api channel config is present', () => {
      expect(
        hasExternalHitlChannels({
          slack_api: { 'connector-id': 'slack-api-1', channels: ['C0123'] },
        })
      ).toBe(true);
    });
  });

  describe('buildWaitForApprovalResumeLinks', () => {
    it('builds approve and reject URLs with the resume token', () => {
      const links = buildWaitForApprovalResumeLinks({
        kibanaUrl: 'https://kibana.example',
        spaceId: 'default',
        executionId: 'exec-1',
        stepId: 'step-exec-1',
        token: 'resume-token',
      });

      expect(links.approveUrl).toContain('approved=true');
      expect(links.rejectUrl).toContain('approved=false');
      expect(links.approveUrl).toContain('/steps/step-exec-1/resume/external');
      expect(links.approveUrl).toContain('token=resume-token');
      expect(links.rejectUrl).toContain('token=resume-token');
    });
  });

  describe('sendWaitForApprovalNotifications', () => {
    const resumeLinks = {
      approveUrl: 'https://kibana.example/approve',
      rejectUrl: 'https://kibana.example/reject',
    };

    it('sends webhook slack notification with mrkdwn-safe resume links', async () => {
      const execute = jest.fn().mockResolvedValue({ status: 'ok' });
      const resumeLinksWithQuery = {
        approveUrl: 'https://kibana.example/approve?token=abc&approved=true',
        rejectUrl: 'https://kibana.example/reject?token=abc&approved=false',
      };

      await sendWaitForApprovalNotifications({
        channels: {
          slack: { 'connector-id': 'slack-webhook-1' },
        },
        message: 'Approve change?',
        approveLabel: 'Approve',
        rejectLabel: 'Decline',
        resumeLinks: resumeLinksWithQuery,
        connectorExecutor: { execute } as never,
        abortController: new AbortController(),
      });

      expect(execute).toHaveBeenCalledTimes(1);
      expect(execute.mock.calls[0][0].connectorType).toBe('slack');
      expect(execute.mock.calls[0][0].input.message).toContain('&amp;approved=true');
      expect(execute.mock.calls[0][0].input.message).toContain(
        '<https://kibana.example/approve?token=abc&amp;approved=true|Approve>'
      );
    });

    it('sends slack and slack_api notifications when both are configured', async () => {
      const execute = jest
        .fn()
        .mockResolvedValueOnce({ status: 'ok' })
        .mockResolvedValueOnce({ status: 'ok' });

      await sendWaitForApprovalNotifications({
        channels: {
          slack: { 'connector-id': 'slack-webhook-1' },
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
      expect(execute.mock.calls[1][0].connectorType).toBe('slack_api');
      expect(execute.mock.calls[1][0].input).toEqual({
        subAction: 'postBlockkit',
        subActionParams: {
          channelIds: ['C0123'],
          text: expect.stringContaining('"type":"actions"'),
        },
      });
    });

    it('sends slack_api notifications to every configured channel', async () => {
      const execute = jest
        .fn()
        .mockResolvedValueOnce({ status: 'ok' })
        .mockResolvedValueOnce({ status: 'ok' });

      await sendWaitForApprovalNotifications({
        channels: {
          slack_api: { 'connector-id': 'slack-api-1', channels: ['C0123', 'C0456'] },
        },
        message: 'Approve change?',
        approveLabel: 'Approve',
        rejectLabel: 'Decline',
        resumeLinks,
        connectorExecutor: { execute } as never,
        abortController: new AbortController(),
      });

      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute.mock.calls[0][0].input.subActionParams.channelIds).toEqual(['C0123']);
      expect(execute.mock.calls[1][0].input.subActionParams.channelIds).toEqual(['C0456']);
    });

    it('throws when a configured connector fails', async () => {
      const execute = jest
        .fn()
        .mockResolvedValue({ status: 'error', message: 'Slack unavailable' });

      await expect(
        sendWaitForApprovalNotifications({
          channels: {
            slack: { 'connector-id': 'slack-1' },
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
