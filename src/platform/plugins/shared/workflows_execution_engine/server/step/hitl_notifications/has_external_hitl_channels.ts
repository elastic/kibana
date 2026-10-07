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
  teams?: { 'connector-id'?: string; 'team-id'?: string; 'channel-id'?: string };
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
  const hasTeams =
    Boolean(channels.teams?.['connector-id']) &&
    Boolean(channels.teams?.['team-id']) &&
    Boolean(channels.teams?.['channel-id']);

  return hasSlack || hasSlackApi || hasSlack2 || hasTeams;
}
