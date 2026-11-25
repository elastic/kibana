/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const slackDeliveryFailureReasons = [
  'channel_not_connected',
  'app_disconnected',
  'rate_limited',
] as const;

export type SlackDeliveryFailureReason = (typeof slackDeliveryFailureReasons)[number];

export const isSlackDeliveryFailureReason = (value: unknown): value is SlackDeliveryFailureReason =>
  slackDeliveryFailureReasons.some((reason) => reason === value);
