/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Builds the URL for the V3 API.
 * @param sendTo Whether to send it to production or staging.
 * @param channelName The name of the channel to send the data to.
 */
export function buildUrl(sendTo: 'production' | 'staging', channelName: string): string {
  const baseUrl =
    sendTo === 'production'
      ? 'https://telemetry.elastic.co'
      : 'https://telemetry-staging.elastic.co';
  return `${baseUrl}/v3/send/${channelName}`;
}
