/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** The options to build the URL of the V3 API. */
export interface BuildUrlOptions {
  /** Whether to send it to production or staging. */
  sendTo: 'production' | 'staging';
  /** The name of the channel to send the data to. */
  channelName: string;
}

/**
 * Builds the URL for the V3 API.
 * @param urlOptions The options to build the URL of the V3 API.
 */
export function buildUrl(urlOptions: BuildUrlOptions): string {
  const { sendTo, channelName } = urlOptions;
  const baseUrl =
    sendTo === 'production'
      ? 'https://telemetry.elastic.co'
      : 'https://telemetry-staging.elastic.co';
  return `${baseUrl}/v3/send/${channelName}`;
}
