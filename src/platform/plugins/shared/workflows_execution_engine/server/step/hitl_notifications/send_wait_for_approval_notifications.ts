/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitForApprovalStep } from '@kbn/workflows';
import { buildExternalResumeUrl } from '@kbn/workflows/server';
import {
  buildDefaultHitlApprovalEmailMessage,
  buildHitlEmailConnectorInput,
  buildHitlExecutionFooterPath,
  resolveHitlEmailSubject,
} from './build_hitl_email_notification';
import {
  assertConnectorSucceeded,
  buildSlack2SendMessageInput,
  slackApiChannelTarget,
} from './hitl_connector_helpers';
import type { ConnectorExecutor } from '../../connector_executor';

type WaitForApprovalChannels = NonNullable<NonNullable<WaitForApprovalStep['with']>['channels']>;

export interface WaitForApprovalResumeLinks {
  approveUrl: string;
  rejectUrl: string;
}

export function buildWaitForApprovalResumeLinks({
  kibanaUrl,
  spaceId,
  executionId,
  stepId,
  token,
}: {
  kibanaUrl: string;
  spaceId: string;
  executionId: string;
  stepId: string;
  token: string;
}): WaitForApprovalResumeLinks {
  const baseParams = { kibanaUrl, spaceId, executionId, stepId, token };

  return {
    approveUrl: buildExternalResumeUrl({ ...baseParams, approved: true }),
    rejectUrl: buildExternalResumeUrl({ ...baseParams, approved: false }),
  };
}

function escapeSlackMrkdwnUrl(url: string): string {
  return url.replace(/&/g, '&amp;');
}

function buildSlackMessage({
  message,
  approveLabel,
  rejectLabel,
  approveUrl,
  rejectUrl,
}: {
  message: string;
  approveLabel: string;
  rejectLabel: string;
  approveUrl: string;
  rejectUrl: string;
}): string {
  const prompt = message.length > 0 ? `${message}\n\n` : '';
  return `${prompt}<${escapeSlackMrkdwnUrl(approveUrl)}|${approveLabel}>  <${escapeSlackMrkdwnUrl(
    rejectUrl
  )}|${rejectLabel}>`;
}

function buildSlackApiBlocks({
  message,
  approveLabel,
  rejectLabel,
  approveUrl,
  rejectUrl,
}: {
  message: string;
  approveLabel: string;
  rejectLabel: string;
  approveUrl: string;
  rejectUrl: string;
}) {
  const blocks: Array<Record<string, unknown>> = [];

  if (message.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: message },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: approveLabel, emoji: true },
        url: approveUrl,
        style: 'primary',
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: rejectLabel, emoji: true },
        url: rejectUrl,
        style: 'danger',
      },
    ],
  });

  return blocks;
}

function buildSlackApiBlockkitInput(
  linkParams: {
    message: string;
    approveLabel: string;
    rejectLabel: string;
    approveUrl: string;
    rejectUrl: string;
  },
  target: { channelNames?: string[]; channelIds?: string[] }
) {
  return {
    subAction: 'postBlockkit' as const,
    subActionParams: {
      ...target,
      text: JSON.stringify({ blocks: buildSlackApiBlocks(linkParams) }),
    },
  };
}

export async function sendWaitForApprovalNotifications({
  channels,
  message,
  approveLabel,
  rejectLabel,
  resumeLinks,
  spaceId,
  executionId,
  connectorExecutor,
  abortController,
}: {
  channels: WaitForApprovalChannels;
  message: string;
  approveLabel: string;
  rejectLabel: string;
  resumeLinks: WaitForApprovalResumeLinks;
  spaceId: string;
  executionId: string;
  connectorExecutor: ConnectorExecutor;
  abortController: AbortController;
}): Promise<void> {
  const linkParams = {
    message,
    approveLabel,
    rejectLabel,
    approveUrl: resumeLinks.approveUrl,
    rejectUrl: resumeLinks.rejectUrl,
  };

  const slackConfig = channels.slack;
  if (slackConfig?.['connector-id']) {
    const result = await connectorExecutor.execute({
      connectorType: 'slack',
      connectorNameOrId: slackConfig['connector-id'],
      input: {
        message: buildSlackMessage(linkParams),
      },
      abortController,
    });
    assertConnectorSucceeded(result);
  }

  const slackApiConfig = channels.slack_api;
  const slackApiConnectorId = slackApiConfig?.['connector-id'];
  const slackApiChannels = slackApiConfig?.channels;
  if (slackApiConnectorId && slackApiChannels?.length) {
    for (const channel of slackApiChannels) {
      const result = await connectorExecutor.execute({
        connectorType: 'slack_api',
        connectorNameOrId: slackApiConnectorId,
        input: buildSlackApiBlockkitInput(linkParams, slackApiChannelTarget(channel)),
        abortController,
      });
      assertConnectorSucceeded(result);
    }
  }

  const slack2Config = channels.slack2;
  const slack2ConnectorId = slack2Config?.['connector-id'];
  const slack2Channels = slack2Config?.channels;
  if (slack2ConnectorId && slack2Channels?.length) {
    const text = buildSlackMessage(linkParams);
    for (const channel of slack2Channels) {
      const result = await connectorExecutor.execute({
        connectorType: 'slack2',
        connectorNameOrId: slack2ConnectorId,
        input: buildSlack2SendMessageInput(channel, text),
        abortController,
      });
      assertConnectorSucceeded(result);
    }
  }

  const emailConfig = channels.email;
  if (emailConfig?.['connector-id'] && emailConfig.to?.length) {
    const result = await connectorExecutor.execute({
      connectorType: 'email',
      connectorNameOrId: emailConfig['connector-id'],
      input: buildHitlEmailConnectorInput({
        emailConfig,
        subject: resolveHitlEmailSubject(emailConfig.subject, 'approval'),
        message: buildDefaultHitlApprovalEmailMessage(linkParams),
        footerLinkPath: buildHitlExecutionFooterPath({ spaceId, executionId }),
      }),
      abortController,
    });
    assertConnectorSucceeded(result);
  }
}
