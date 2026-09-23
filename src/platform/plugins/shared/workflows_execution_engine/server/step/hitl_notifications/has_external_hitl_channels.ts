/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ExternalHitlChannels {
  slack?: { 'connector-id'?: string };
  slack_api?: { 'connector-id'?: string; channels?: string[] };
  slack2?: { 'connector-id'?: string; channels?: string[] };
  email?: { 'connector-id'?: string; to?: string[] };
}

export function hasExternalHitlChannels(
  channels: ExternalHitlChannels | undefined
): channels is ExternalHitlChannels {
  if (!channels) {
    return false;
  }

  const hasSlack = Boolean(channels.slack?.['connector-id']);
  const hasSlackApi =
    Boolean(channels.slack_api?.['connector-id']) && Boolean(channels.slack_api?.channels?.length);
  const hasSlack2 =
    Boolean(channels.slack2?.['connector-id']) && Boolean(channels.slack2?.channels?.length);
  const hasEmail = Boolean(channels.email?.['connector-id']) && Boolean(channels.email?.to?.length);

  return hasSlack || hasSlackApi || hasSlack2 || hasEmail;
}
