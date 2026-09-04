/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Owning-team Slack channels for kibana-security-solution-on-merge.
 *
 * Step-level `SLACK_NOTIFICATIONS_CHANNEL` is ignored by kibana-buildkite-build-bot
 * (it only reads pipeline env). This map is used by a post-build fan-out that
 * uploads Buildkite `notify.slack` steps instead.
 *
 * Rule Management goes to `#security-detection-engineering-team` because
 * `#security-detection-rule-management` was archived in June 2026.
 */
export const FALLBACK_SLACK_CHANNEL = '#sdh-security-team';

export const STEP_CHANNEL_MATCHERS: Array<{ pattern: RegExp; channel: string }> = [
  { pattern: /rule management/i, channel: '#security-detection-engineering-team' },
  { pattern: /detection engine/i, channel: '#security-detection-engineering-team' },
  { pattern: /entity analytics/i, channel: '#security-entity-analytics-alerts' },
  { pattern: /explore/i, channel: '#security-threat-hunting' },
  { pattern: /investigations/i, channel: '#security-threat-hunting' },
  { pattern: /ai assistant/i, channel: '#security-threat-hunting' },
  { pattern: /osquery/i, channel: '#security-defend-workflows' },
  { pattern: /defend workflows/i, channel: '#security-defend-workflows' },
];

export function getChannelForStepLabel(label: string): string {
  const match = STEP_CHANNEL_MATCHERS.find(({ pattern }) => pattern.test(label));
  return match?.channel ?? FALLBACK_SLACK_CHANNEL;
}
