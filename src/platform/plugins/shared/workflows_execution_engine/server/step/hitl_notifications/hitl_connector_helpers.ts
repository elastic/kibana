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

interface HitlHttpChannelConfig {
  'connector-id'?: string;
  url?: string;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function renderOptionalTemplate(
  value: string | undefined,
  renderTemplate: (template: string) => string
): string | undefined {
  if (value == null) {
    return undefined;
  }
  const rendered = renderTemplate(value);
  return rendered.length > 0 ? rendered : undefined;
}

/** Renders an HITL HTTP channel and builds the workflow HTTP connector params. */
export function renderHitlHttpConnectorInput(
  channel: HitlHttpChannelConfig,
  renderTemplate: (template: string) => string
) {
  const headers = channel.headers
    ? Object.fromEntries(
        Object.entries(channel.headers).map(([name, value]) => {
          const renderedName = renderTemplate(name);
          if (renderedName.length === 0) {
            throw new Error('HTTP HITL header name rendered to an empty string');
          }
          return [renderedName, renderTemplate(value)];
        })
      )
    : undefined;

  return buildHitlHttpConnectorInput({
    url: renderOptionalTemplate(channel.url, renderTemplate),
    path: renderOptionalTemplate(channel.path, renderTemplate),
    method: channel.method,
    headers,
    body: renderOptionalTemplate(channel.body, renderTemplate),
  });
}

/** Sends a rendered HITL HTTP request through a saved connector, or the system connector when none is set. */
export async function executeHitlHttpChannel({
  channel,
  renderTemplate,
  connectorExecutor,
  abortController,
}: {
  channel: HitlHttpChannelConfig;
  renderTemplate: (template: string) => string;
  connectorExecutor: {
    execute: (params: {
      connectorType: string;
      connectorNameOrId: string;
      input: Record<string, unknown>;
      abortController: AbortController;
    }) => Promise<{ status: string; message?: string; serviceMessage?: string }>;
    executeSystemConnector: (params: {
      connectorType: string;
      input: Record<string, unknown>;
      abortController: AbortController;
    }) => Promise<{ status: string; message?: string; serviceMessage?: string }>;
  };
  abortController: AbortController;
}): Promise<void> {
  const input = renderHitlHttpConnectorInput(channel, renderTemplate);
  const connectorId = channel['connector-id'];
  const result = connectorId
    ? await connectorExecutor.execute({
        connectorType: 'http',
        connectorNameOrId: connectorId,
        input,
        abortController,
      })
    : await connectorExecutor.executeSystemConnector({
        connectorType: '.http-system',
        input,
        abortController,
      });
  assertConnectorSucceeded(result);
}

/** Builds params for the workflow HTTP system connector. */
export function buildHitlHttpConnectorInput({
  url,
  path,
  method,
  headers,
  body,
}: {
  url?: string;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) {
  return {
    ...(url ? { url } : {}),
    ...(path ? { path } : {}),
    method: method ?? 'POST',
    ...(headers ? { headers } : {}),
    ...(body ? { body } : {}),
  };
}

/**
 * Builds Actions params for a Slack v2 `sendMessage` call.
 * Unfurling is off so Slack does not GET the resume URL.
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
