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
import {
  assertConnectorSucceeded,
  buildServiceNowAddCommentInput,
  buildSlack2SendMessageInput,
  fitHitlRenderedTextPreservingLink,
  fitHitlTextPreservingSuffix,
  SERVICENOW_COMMENT_MAX_LENGTH,
  slackApiChannelTarget,
} from './hitl_connector_helpers';
import type { ConnectorExecutor } from '../../connector_executor';

type WaitForInputChannels = NonNullable<NonNullable<WaitForInputStep['with']>['channels']>;

function escapeSlackMrkdwnUrl(url: string): string {
  return url.replace(/&/g, '&amp;');
}

function buildDefaultInputServiceNowComment({
  stepMessage,
  formUrl,
}: {
  stepMessage: string;
  formUrl: string;
}): string {
  return fitHitlTextPreservingSuffix(
    stepMessage,
    `Open form: ${formUrl}`,
    SERVICENOW_COMMENT_MAX_LENGTH
  );
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
  target: { channelNames?: string[]; channelIds?: string[] }
) {
  return {
    subAction: 'postBlockkit' as const,
    subActionParams: {
      ...target,
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
  const slackApiChannels = slackApiConfig?.channels;
  if (slackApiConnectorId && slackApiChannels?.length) {
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

    for (const channel of slackApiChannels) {
      const result = await connectorExecutor.execute({
        connectorType: 'slack_api',
        connectorNameOrId: slackApiConnectorId,
        input: buildSlackApiBlockkitInput(slackApiBlocks, slackApiChannelTarget(channel)),
        abortController,
      });
      assertConnectorSucceeded(result);
    }
  }

  const slack2Config = channels.slack2;
  const slack2ConnectorId = slack2Config?.['connector-id'];
  const slack2Channels = slack2Config?.channels;
  if (slack2ConnectorId && slack2Channels?.length) {
    const text =
      slack2Config.message != null
        ? resolveWaitForInputChannelMessage({
            channelMessageTemplate: slack2Config.message,
            stepMessage,
            formUrl,
            renderTemplate,
          })
        : buildDefaultInputSlackMessage({ stepMessage, formUrl });

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

  const serviceNowConfig = channels.servicenow;
  const serviceNowConnectorId = serviceNowConfig?.['connector-id'];
  const serviceNowTable = serviceNowConfig?.table;
  const serviceNowSysId = serviceNowConfig?.['sys-id'];
  if (serviceNowConnectorId && serviceNowTable && serviceNowSysId) {
    const comment =
      serviceNowConfig.message != null
        ? fitHitlRenderedTextPreservingLink(
            resolveWaitForInputChannelMessage({
              channelMessageTemplate: serviceNowConfig.message,
              stepMessage,
              formUrl,
              renderTemplate,
            }),
            formUrl,
            SERVICENOW_COMMENT_MAX_LENGTH
          )
        : buildDefaultInputServiceNowComment({ stepMessage, formUrl });

    const result = await connectorExecutor.execute({
      connectorType: 'servicenow_search',
      connectorNameOrId: serviceNowConnectorId,
      input: buildServiceNowAddCommentInput(serviceNowTable, serviceNowSysId, comment),
      abortController,
    });
    assertConnectorSucceeded(result);
  }
}
