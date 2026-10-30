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

const HITL_WORD_JOINER = '\u2060';
const HITL_FULLWIDTH_VERTICAL_LINE = '\uff5c';

/** Keeps `http://`, `https://`, and `//` from becoming an autolink. The text still reads as the URL. */
function breakHitlSchemeUrls(value: string): string {
  const withSchemeBroken = value.replace(
    /https?:\/\//gi,
    (scheme) => `${scheme.slice(0, -2)}${HITL_WORD_JOINER}//`
  );
  return withSchemeBroken.replace(/\/\//g, (match, offset, full) =>
    full[offset - 1] === HITL_WORD_JOINER ? match : `/${HITL_WORD_JOINER}/`
  );
}

function needsEmailMarkdownEscape(value: string, index: number): boolean {
  const char = value[index];
  if (char === '[' || char === ']' || char === '`' || char === '~') {
    return true;
  }
  if (char !== '<') {
    return false;
  }
  const scheme = value.slice(index + 1, index + 9).toLowerCase();
  return (
    scheme.startsWith('https://') || scheme.startsWith('http://') || scheme.startsWith('mailto:')
  );
}

/** Escapes markdown characters in one pass. An odd run of backslashes already escapes the next one. */
function escapeHitlEmailMarkdownChars(value: string): string {
  const parts: string[] = [];
  let slashCount = 0;

  const pushSlashes = (escapeNext: boolean) => {
    if (slashCount > 0) {
      parts.push('\\'.repeat(slashCount));
    }
    if (escapeNext && slashCount % 2 === 0) {
      parts.push('\\');
    }
    slashCount = 0;
  };

  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '\\') {
      slashCount++;
    } else {
      pushSlashes(needsEmailMarkdownEscape(value, index));
      parts.push(char);
    }
  }
  if (slashCount > 0) {
    parts.push('\\'.repeat(slashCount));
  }

  return parts.join('');
}

/** Escapes generated email text so it cannot add a markdown link or code fence. */
export function escapeHitlEmailMarkdown(value: string): string {
  return breakHitlSchemeUrls(escapeHitlEmailMarkdownChars(value));
}

/** Escapes an email link label, including a trailing backslash. */
export function escapeHitlEmailLinkLabel(value: string): string {
  return escapeHitlEmailMarkdown(value.replace(/\\/g, '\\\\'));
}

/** Escapes `&`, `<`, and `>` so Slack cannot treat them as mrkdwn control characters. */
function escapeSlackMrkdwnControlCharacters(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escapes generated Slack mrkdwn so it cannot open an explicit link. Mentions stay intact. */
export function escapeSlackMrkdwnText(value: string): string {
  return breakHitlSchemeUrls(
    value.replace(/&/g, '&amp;').replace(/<([@!#][^>\n]*)>|<|>/g, (token) => {
      if (token === '<') {
        return '&lt;';
      }
      if (token === '>') {
        return '&gt;';
      }
      return token;
    })
  );
}

/** Collapses line breaks so a label stays inside one generated link. */
export function flattenHitlLinkLabel(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]+/g, ' ');
}

/** Escapes a label used inside a Slack `<url|label>` link. */
export function escapeSlackMrkdwnLabel(value: string): string {
  return breakHitlSchemeUrls(
    escapeSlackMrkdwnControlCharacters(flattenHitlLinkLabel(value))
  ).replace(/\|/g, HITL_FULLWIDTH_VERTICAL_LINE);
}

/** Escapes `&` in a resume URL placed inside Slack mrkdwn. */
export function escapeSlackMrkdwnUrl(url: string): string {
  return url.replace(/&/g, '&amp;');
}

export const SLACK_SECTION_TEXT_MAX_LENGTH = 3000;

/** Shortens escaped Slack section text to 3,000 characters without splitting an entity. */
export function fitSlackMrkdwnSectionText(value: string): string {
  if (value.length <= SLACK_SECTION_TEXT_MAX_LENGTH) {
    return value;
  }

  const slice = value.slice(0, SLACK_SECTION_TEXT_MAX_LENGTH);
  const ampersand = slice.lastIndexOf('&');
  if (ampersand !== -1 && !slice.slice(ampersand).includes(';')) {
    return slice.slice(0, ampersand);
  }

  return slice;
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
export const TEAMS_CONTENT_MAX_LENGTH = 10000;

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

/** Stops ServiceNow from reading `[code]` in user text as journal HTML. */
function breakServiceNowCodeTag(value: string): string {
  return value.replace(/\[(\/?code)\]/gi, '[\u200b$1]');
}

/**
 * Makes comment text safe to place outside a journal anchor.
 * Angle brackets are replaced, not encoded: ServiceNow decodes `&lt;` and then rejects the tag.
 */
export function escapeServiceNowCommentText(value: string): string {
  return breakServiceNowCodeTag(value).replace(/</g, '\uFF1C').replace(/>/g, '\uFF1E');
}

function escapeServiceNowHtml(value: string): string {
  return breakServiceNowCodeTag(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** ServiceNow journal HTML. The activity stream renders this as an anchor. */
export function serviceNowCommentLink(label: string, url: string): string {
  return `[code]<a href="${escapeServiceNowHtml(url)}">${escapeServiceNowHtml(label)}</a>[/code]`;
}

/** Renders a required ServiceNow channel field and rejects a blank result. */
export function renderServiceNowField(
  value: string,
  renderTemplate: (template: string) => string,
  field: 'table' | 'sys-id'
): string {
  const rendered = renderTemplate(value).trim();
  if (rendered.length === 0) {
    throw new Error(`HITL ServiceNow "${field}" rendered empty`);
  }
  return rendered;
}

/** Renders a required Teams channel field and rejects a blank result. */
export function renderTeamsField(
  value: string,
  renderTemplate: (template: string) => string,
  field: 'team-id' | 'channel-id'
): string {
  const rendered = renderTemplate(value).trim();
  if (rendered.length === 0) {
    throw new Error(`HITL Teams "${field}" rendered empty`);
  }
  return rendered;
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

/** Makes step text safe to place next to an HTML anchor. Teams renders the body as HTML. */
export function escapeTeamsHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Teams message HTML. The channel renders this as an anchor. */
export function teamsHtmlLink(label: string, url: string): string {
  return `<a href="${escapeTeamsHtml(url)}">${escapeTeamsHtml(label)}</a>`;
}

/** Builds Actions params for a Microsoft Teams `sendChannelMessage` call. */
export function buildTeamsSendChannelMessageInput(
  teamId: string,
  channelId: string,
  content: string,
  contentType: 'text' | 'html' = 'html'
) {
  return {
    subAction: 'sendChannelMessage' as const,
    subActionParams: {
      teamId,
      channelId,
      content,
      contentType,
    },
  };
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
