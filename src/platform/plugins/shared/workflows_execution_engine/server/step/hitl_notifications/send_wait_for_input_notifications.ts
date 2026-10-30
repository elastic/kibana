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
import {
  absoluteUrlToKibanaFooterPath,
  assertRenderedHitlEmailRecipients,
  buildDefaultHitlInputEmailMessage,
  buildHitlEmailConnectorInput,
  renderHitlEmailAddresses,
  resolveHitlEmailSubject,
} from './build_hitl_email_notification';
import { hasExternalHitlChannels } from './has_external_hitl_channels';
import {
  assertConnectorSucceeded,
  buildServiceNowAddCommentInput,
  buildSlack2SendMessageInput,
  buildTeamsSendChannelMessageInput,
  escapeServiceNowCommentText,
  escapeTeamsHtml,
  executeHitlHttpChannel,
  fitHitlTextPreservingSuffix,
  renderServiceNowField,
  renderTeamsField,
  SERVICENOW_COMMENT_MAX_LENGTH,
  serviceNowCommentLink,
  slackApiChannelTarget,
  TEAMS_CONTENT_MAX_LENGTH,
  teamsHtmlLink,
} from './hitl_connector_helpers';
import type { HitlSlackInteractiveResumeContext } from './hitl_slack_interactive_blocks';
import { buildHitlSlackInputBlocksFromSchema } from './hitl_slack_interactive_blocks';
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
    escapeServiceNowCommentText(stepMessage),
    serviceNowCommentLink(DEFAULT_HITL_INPUT_OPEN_FORM_LABEL, formUrl),
    SERVICENOW_COMMENT_MAX_LENGTH
  );
}

function buildDefaultInputTeamsMessage({
  stepMessage,
  formUrl,
}: {
  stepMessage: string;
  formUrl: string;
}): string {
  return fitHitlTextPreservingSuffix(
    escapeTeamsHtml(stepMessage),
    `<br>${teamsHtmlLink(DEFAULT_HITL_INPUT_OPEN_FORM_LABEL, formUrl)}`,
    TEAMS_CONTENT_MAX_LENGTH
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
  kibanaUrl,
  inputSchema,
  slackInteractiveResume,
  renderTemplate,
  connectorExecutor,
  abortController,
}: {
  channels: WaitForInputChannels;
  stepMessage: string;
  formUrl: string;
  kibanaUrl: string;
  inputSchema?: unknown;
  /** Required when `channels.slack2.interactive` is true. */
  slackInteractiveResume?: HitlSlackInteractiveResumeContext;
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

  const emailConfig = channels.email;
  if (emailConfig?.['connector-id']) {
    const emailTo = renderHitlEmailAddresses(emailConfig.to, renderTemplate);
    assertRenderedHitlEmailRecipients(emailTo);
    const message =
      emailConfig.message != null
        ? resolveWaitForInputChannelMessage({
            channelMessageTemplate: emailConfig.message,
            stepMessage,
            formUrl,
            renderTemplate,
          })
        : buildDefaultHitlInputEmailMessage({ stepMessage, formUrl });

    const result = await connectorExecutor.execute({
      connectorType: 'email',
      connectorNameOrId: emailConfig['connector-id'],
      input: buildHitlEmailConnectorInput({
        emailConfig: {
          ...emailConfig,
          to: emailTo,
          cc: renderHitlEmailAddresses(emailConfig.cc, renderTemplate),
          bcc: renderHitlEmailAddresses(emailConfig.bcc, renderTemplate),
        },
        subject: resolveHitlEmailSubject(
          emailConfig.subject != null ? renderTemplate(emailConfig.subject) : undefined,
          'input'
        ),
        message,
        footerLinkPath: absoluteUrlToKibanaFooterPath(formUrl, kibanaUrl),
      }),
      abortController,
    });
    assertConnectorSucceeded(result);
  }

  const slack2Config = channels.slack2;
  const slack2ConnectorId = slack2Config?.['connector-id'];
  const slack2Channels = slack2Config?.channels;
  if (slack2ConnectorId && slack2Channels?.length) {
    const interactive = slack2Config.interactive === true;
    if (interactive && !slackInteractiveResume) {
      throw new Error('Slack interactive HITL input requires resume correlation context');
    }
    const text = interactive
      ? stepMessage.length > 0
        ? stepMessage
        : 'Provide the requested input'
      : slack2Config.message != null
      ? resolveWaitForInputChannelMessage({
          channelMessageTemplate: slack2Config.message,
          stepMessage,
          formUrl,
          renderTemplate,
        })
      : buildDefaultInputSlackMessage({ stepMessage, formUrl });
    const blocks =
      interactive && slackInteractiveResume
        ? buildHitlSlackInputBlocksFromSchema({
            message: stepMessage,
            schema: inputSchema,
            resume: slackInteractiveResume,
          })
        : undefined;

    for (const channel of slack2Channels) {
      const result = await connectorExecutor.execute({
        connectorType: 'slack2',
        connectorNameOrId: slack2ConnectorId,
        input: buildSlack2SendMessageInput(channel, text, blocks),
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
    const table = renderServiceNowField(serviceNowTable, renderTemplate, 'table');
    const sysId = renderServiceNowField(serviceNowSysId, renderTemplate, 'sys-id');
    const renderedComment =
      serviceNowConfig.message != null
        ? resolveWaitForInputChannelMessage({
            channelMessageTemplate: serviceNowConfig.message,
            stepMessage,
            formUrl,
            renderTemplate,
          })
        : undefined;
    if (renderedComment != null && renderedComment.length > SERVICENOW_COMMENT_MAX_LENGTH) {
      throw new Error(
        `HITL ServiceNow message is ${renderedComment.length} characters and exceeds the ${SERVICENOW_COMMENT_MAX_LENGTH} character connector limit`
      );
    }
    const comment = renderedComment ?? buildDefaultInputServiceNowComment({ stepMessage, formUrl });

    const result = await connectorExecutor.execute({
      connectorType: 'servicenow_search',
      connectorNameOrId: serviceNowConnectorId,
      input: buildServiceNowAddCommentInput(table, sysId, comment),
      abortController,
    });
    assertConnectorSucceeded(result);
  }

  const teamsConfig = channels.teams;
  const teamsConnectorId = teamsConfig?.['connector-id'];
  const teamId = teamsConfig?.['team-id'];
  const channelId = teamsConfig?.['channel-id'];
  if (teamsConnectorId && teamId && channelId) {
    const renderedTeamId = renderTeamsField(teamId, renderTemplate, 'team-id');
    const renderedChannelId = renderTeamsField(channelId, renderTemplate, 'channel-id');
    const renderedComment =
      teamsConfig.message != null
        ? resolveWaitForInputChannelMessage({
            channelMessageTemplate: teamsConfig.message,
            stepMessage,
            formUrl,
            renderTemplate,
          })
        : undefined;
    if (renderedComment != null && renderedComment.length > TEAMS_CONTENT_MAX_LENGTH) {
      throw new Error(
        `HITL Teams message is ${renderedComment.length} characters and exceeds the ${TEAMS_CONTENT_MAX_LENGTH} character connector limit`
      );
    }
    const content = renderedComment ?? buildDefaultInputTeamsMessage({ stepMessage, formUrl });

    const result = await connectorExecutor.execute({
      connectorType: 'microsoft-teams',
      connectorNameOrId: teamsConnectorId,
      input: buildTeamsSendChannelMessageInput(
        renderedTeamId,
        renderedChannelId,
        content,
        renderedComment != null ? 'text' : 'html'
      ),
      abortController,
    });
    assertConnectorSucceeded(result);
  }

  const httpConfig = channels.http;
  if (httpConfig && (httpConfig['connector-id'] || httpConfig.url)) {
    await executeHitlHttpChannel({
      channel: httpConfig,
      renderTemplate,
      connectorExecutor,
      abortController,
    });
  }
}
