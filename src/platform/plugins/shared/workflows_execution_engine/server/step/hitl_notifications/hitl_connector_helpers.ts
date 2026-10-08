/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function assertConnectorSucceeded(result: {
  status: string;
  message?: string;
  serviceMessage?: string;
}) {
  if (result.status === 'ok') {
    return;
  }

  throw new Error(result.serviceMessage ?? result.message ?? 'Connector execution failed');
}

export type SlackApiChannelTarget = { channelNames: string[] } | { channelIds: string[] };

/** Maps a HITL `channels.slack_api.channels` entry to the Slack API connector param. */
export function slackApiChannelTarget(channel: string): SlackApiChannelTarget {
  if (channel.startsWith('#')) {
    return { channelNames: [channel] };
  }

  return { channelIds: [channel] };
}

export const SERVICENOW_COMMENT_MAX_LENGTH = 4000;

/** Keeps `suffix` intact and shortens `prompt` so the joined text fits `maxLength`. */
export function fitHitlTextPreservingSuffix(
  prompt: string,
  suffix: string,
  maxLength: number
): string {
  if (suffix.length > maxLength) {
    throw new Error(
      `HITL resume links are ${suffix.length} characters and exceed the ${maxLength} character connector limit`
    );
  }
  if (prompt.length === 0) {
    return suffix;
  }
  if (prompt.length + 2 + suffix.length <= maxLength) {
    return `${prompt}\n\n${suffix}`;
  }
  const promptBudget = maxLength - suffix.length - 2;
  if (promptBudget <= 0) {
    return suffix;
  }
  return `${prompt.slice(0, promptBudget)}\n\n${suffix}`;
}

/** Shortens text around `link` so the link itself is not cut. */
export function fitHitlRenderedTextPreservingLink(
  text: string,
  link: string,
  maxLength: number
): string {
  if (link.length > maxLength) {
    throw new Error(
      `HITL resume links are ${link.length} characters and exceed the ${maxLength} character connector limit`
    );
  }
  if (text.length <= maxLength) {
    return text;
  }
  const linkAt = text.indexOf(link);
  if (linkAt === -1) {
    return text.slice(0, maxLength);
  }
  const budget = maxLength - link.length;
  const prefix = text.slice(0, linkAt).slice(0, budget);
  const after = text.slice(linkAt + link.length).slice(0, Math.max(0, budget - prefix.length));
  return `${prefix}${link}${after}`;
}

/** Builds Actions params for a ServiceNow `addComment` call. */
export function buildServiceNowAddCommentInput(table: string, sysId: string, comment: string) {
  return {
    subAction: 'addComment' as const,
    subActionParams: {
      table,
      sysId,
      comment,
    },
  };
}

/**
 * Builds Actions params for a Slack v2 `sendMessage` call.
 * Unfurling is off so Slack does not GET the resume URL on preview.
 */
export function buildSlack2SendMessageInput(channel: string, text: string) {
  return {
    subAction: 'sendMessage' as const,
    subActionParams: {
      channel,
      text,
      unfurlLinks: false,
      unfurlMedia: false,
    },
  };
}
