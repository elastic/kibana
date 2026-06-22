/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitForApprovalStep } from '@kbn/workflows';
import {
  buildExternalResumeUrl,
  createExternalResumeTokenPayload,
  signExternalResumeToken,
} from '@kbn/workflows/server';
import type { ConnectorExecutor } from '../../connector_executor';
import { parseDuration } from '../../utils';

type WaitForApprovalChannels = NonNullable<NonNullable<WaitForApprovalStep['with']>['channels']>;

export interface WaitForApprovalResumeLinks {
  approveUrl: string;
  rejectUrl: string;
}

export function hasExternalApprovalChannels(
  channels: WaitForApprovalChannels | undefined
): channels is WaitForApprovalChannels {
  if (!channels) {
    return false;
  }

  const hasSlack = Boolean(channels.slack?.['connector-id']) && Boolean(channels.slack?.channel);
  const hasSlackApi =
    Boolean(channels.slack_api?.['connector-id']) && Boolean(channels.slack_api?.channels?.length);

  return hasSlack || hasSlackApi;
}

export function buildWaitForApprovalResumeLinks({
  kibanaUrl,
  spaceId,
  executionId,
  stepId,
  timeout,
  signingKey,
}: {
  kibanaUrl: string;
  spaceId: string;
  executionId: string;
  stepId: string;
  timeout: string;
  signingKey: string;
}): WaitForApprovalResumeLinks {
  const payload = createExternalResumeTokenPayload({
    spaceId,
    executionId,
    stepId,
    ttlMs: parseDuration(timeout),
  });
  const token = signExternalResumeToken(payload, signingKey);
  const baseParams = { kibanaUrl, spaceId, executionId, token };

  return {
    approveUrl: buildExternalResumeUrl({ ...baseParams, approved: true }),
    rejectUrl: buildExternalResumeUrl({ ...baseParams, approved: false }),
  };
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
  return `${prompt}<${approveUrl}|${approveLabel}>  <${rejectUrl}|${rejectLabel}>`;
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

function assertConnectorSucceeded(result: {
  status: string;
  message?: string;
  serviceMessage?: string;
}) {
  if (result.status === 'ok') {
    return;
  }

  throw new Error(result.message ?? result.serviceMessage ?? 'Connector execution failed');
}

export async function sendWaitForApprovalNotifications({
  channels,
  message,
  approveLabel,
  rejectLabel,
  resumeLinks,
  connectorExecutor,
  abortController,
}: {
  channels: WaitForApprovalChannels;
  message: string;
  approveLabel: string;
  rejectLabel: string;
  resumeLinks: WaitForApprovalResumeLinks;
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

  if (channels.slack?.['connector-id'] && channels.slack.channel) {
    const result = await connectorExecutor.execute({
      connectorType: 'slack',
      connectorNameOrId: channels.slack['connector-id'],
      input: {
        message: buildSlackMessage(linkParams),
        channel: channels.slack.channel,
      },
      abortController,
    });
    assertConnectorSucceeded(result);
  }

  if (channels.slack_api?.['connector-id'] && channels.slack_api.channels?.length) {
    const result = await connectorExecutor.execute({
      connectorType: 'slack_api',
      connectorNameOrId: channels.slack_api['connector-id'],
      input: {
        subAction: 'postMessage',
        subActionParams: {
          channels: channels.slack_api.channels,
          text: message.length > 0 ? message : `${approveLabel} / ${rejectLabel}`,
          blocks: buildSlackApiBlocks(linkParams),
        },
      },
      abortController,
    });
    assertConnectorSucceeded(result);
  }
}
