/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Slack's documented message link (https://docs.slack.dev/reference/methods/chat.getPermalink)
 * needs the workspace domain, which events do not carry, so this is the web client's own URL.
 */
export const buildSlackThreadUrl = ({
  workspace,
  channel,
  threadTs,
}: {
  workspace: string;
  channel: string;
  threadTs: string;
}): string =>
  `https://app.slack.com/client/${[workspace, channel, 'thread', `${channel}-${threadTs}`]
    .map(encodeURIComponent)
    .join('/')}`;
