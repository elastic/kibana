/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import type { SlackSendMessageInput } from './types';
import {
  formatSlackApiErrorMessage,
  SLACK_API_BASE,
  SLACK_MAX_RETRIES,
  slackRequestWithRateLimitRetry,
} from './request';

interface SlackSendMessageResponse {
  ok: boolean;
  error?: string;
  channel?: string;
  ts?: string;
}

export const getSendMessagePayload = ({
  text,
  blocks,
  threadTs,
  unfurlLinks,
  unfurlMedia,
}: SlackSendMessageInput): Record<string, unknown> => ({
  ...(text !== undefined ? { text } : {}),
  ...(blocks !== undefined ? { blocks } : {}),
  ...(threadTs !== undefined ? { thread_ts: threadTs } : {}),
  ...(unfurlLinks !== undefined ? { unfurl_links: unfurlLinks } : {}),
  ...(unfurlMedia !== undefined ? { unfurl_media: unfurlMedia } : {}),
});

export const sendMessageViaWebhook = async (
  ctx: ActionContext,
  payload: Record<string, unknown>
): Promise<{ ok: true }> => {
  const webhookUrl = ctx.secrets?.webhookUrl;
  if (typeof webhookUrl !== 'string') {
    throw new Error('webhookUrl is required for incoming webhook authentication');
  }

  ctx.log.debug('Slack sendMessage request using incoming webhook');
  const response = await slackRequestWithRateLimitRetry<string>({
    ctx,
    action: 'sendMessage',
    maxRetries: SLACK_MAX_RETRIES,
    request: () =>
      ctx.client.post<string>(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
  });
  if (response.data !== 'ok') {
    throw new Error('Slack incoming webhook returned an unsuccessful response');
  }
  return { ok: true };
};

export const sendMessageViaWebApi = async (
  ctx: ActionContext,
  input: SlackSendMessageInput
): Promise<SlackSendMessageResponse> => {
  if (!input.channel) {
    throw new Error('channel is required for OAuth and bot token authentication');
  }

  const payload: Record<string, unknown> = {
    ...getSendMessagePayload(input),
    channel: input.channel,
  };

  ctx.log.debug(`Slack sendMessage request: channel=${input.channel}`);
  const response = await slackRequestWithRateLimitRetry<SlackSendMessageResponse>({
    ctx,
    action: 'sendMessage',
    maxRetries: SLACK_MAX_RETRIES,
    request: () =>
      ctx.client.post<SlackSendMessageResponse>(`${SLACK_API_BASE}/chat.postMessage`, payload, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
  });

  if (!response.data.ok) {
    throw new Error(
      formatSlackApiErrorMessage({
        action: 'sendMessage',
        responseData: response.data,
        responseHeaders: response.headers,
      })
    );
  }
  return response.data;
};
