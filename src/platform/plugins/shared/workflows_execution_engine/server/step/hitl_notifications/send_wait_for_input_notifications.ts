/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitForInputStep } from '@kbn/workflows';
import {
  DEFAULT_HITL_INPUT_CHANNEL_MESSAGE,
  DEFAULT_HITL_INPUT_OPEN_FORM_LABEL,
} from '@kbn/workflows/server';
import { hasExternalHitlChannels } from './has_external_hitl_channels';
import { assertConnectorSucceeded } from './hitl_connector_helpers';
import type { ConnectorExecutor } from '../../connector_executor';

type WaitForInputChannels = NonNullable<NonNullable<WaitForInputStep['with']>['channels']>;

function escapeSlackMrkdwnUrl(url: string): string {
  return url.replace(/&/g, '&amp;');
}

function buildDefaultInputSlackMessage({
  stepMessage,
  formUrl,
}: {
  stepMessage: string;
  formUrl: string;
}): string {
  const prompt = stepMessage.length > 0 ? `${stepMessage}\n\n` : '';
  return `${prompt}<${escapeSlackMrkdwnUrl(formUrl)}|${DEFAULT_HITL_INPUT_OPEN_FORM_LABEL}>`;
}

function buildInputSlackApiBlocksFromMessage(message: string) {
  const blocks: Array<Record<string, unknown>> = [];

  if (message.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: message },
    });
  }

  return blocks;
}

function buildDefaultInputSlackApiBlocks({
  stepMessage,
  formUrl,
}: {
  stepMessage: string;
  formUrl: string;
}) {
  const blocks = buildInputSlackApiBlocksFromMessage(stepMessage);

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: DEFAULT_HITL_INPUT_OPEN_FORM_LABEL, emoji: true },
        url: formUrl,
      },
    ],
  });

  return blocks;
}

function buildSlackApiBlockkitInput(
  blocks: Array<Record<string, unknown>>,
  target: { channelIds: string[] }
) {
  return {
    subAction: 'postBlockkit' as const,
    subActionParams: {
      channelIds: target.channelIds,
      text: JSON.stringify({ blocks }),
    },
  };
}

export function resolveWaitForInputChannelMessage({
  channelMessageTemplate,
  stepMessage,
  formUrl,
  renderTemplate,
}: {
  channelMessageTemplate: string | undefined;
  stepMessage: string;
  formUrl: string;
  renderTemplate: (template: string) => string;
}): string {
  if (channelMessageTemplate) {
    return renderTemplate(channelMessageTemplate);
  }

  const defaultTemplate =
    stepMessage.length > 0
      ? `${stepMessage}\n\n${DEFAULT_HITL_INPUT_CHANNEL_MESSAGE}`
      : DEFAULT_HITL_INPUT_CHANNEL_MESSAGE;

  return renderTemplate(defaultTemplate);
}

export async function sendWaitForInputNotifications({
  channels,
  stepMessage,
  formUrl,
  renderTemplate,
  connectorExecutor,
  abortController,
}: {
  channels: WaitForInputChannels;
  stepMessage: string;
  formUrl: string;
  renderTemplate: (template: string) => string;
  connectorExecutor: ConnectorExecutor;
  abortController: AbortController;
}): Promise<void> {
  if (!hasExternalHitlChannels(channels)) {
    return;
  }

  const slackConfig = channels.slack;
  if (slackConfig?.['connector-id']) {
    const message = resolveWaitForInputChannelMessage({
      channelMessageTemplate: slackConfig.message,
      stepMessage,
      formUrl,
      renderTemplate,
    });
    const slackMessage =
      slackConfig.message != null
        ? message
        : buildDefaultInputSlackMessage({ stepMessage, formUrl });

    const result = await connectorExecutor.execute({
      connectorType: 'slack',
      connectorNameOrId: slackConfig['connector-id'],
      input: { message: slackMessage },
      abortController,
    });
    assertConnectorSucceeded(result);
  }

  const slackApiConfig = channels.slack_api;
  const slackApiConnectorId = slackApiConfig?.['connector-id'];
  const slackApiChannelIds = slackApiConfig?.channels;
  if (slackApiConnectorId && slackApiChannelIds?.length) {
    const slackApiBlocks =
      slackApiConfig.message != null
        ? buildInputSlackApiBlocksFromMessage(
            resolveWaitForInputChannelMessage({
              channelMessageTemplate: slackApiConfig.message,
              stepMessage,
              formUrl,
              renderTemplate,
            })
          )
        : buildDefaultInputSlackApiBlocks({ stepMessage, formUrl });

    for (const channelId of slackApiChannelIds) {
      const result = await connectorExecutor.execute({
        connectorType: 'slack_api',
        connectorNameOrId: slackApiConnectorId,
        input: buildSlackApiBlockkitInput(slackApiBlocks, {
          channelIds: [channelId],
        }),
        abortController,
      });
      assertConnectorSucceeded(result);
    }
  }
}
