/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ENDPOINT_VERSION,
  ENDPOINT_STAGING,
  ENDPOINT_PROD,
  TELEMETRY_CHANNELS,
} from '../constants';

export type ChannelName = 'snapshot' | 'optInStatus';
export type TelemetryEnv = 'staging' | 'prod';
export interface GetTelemetryChannelEndpointConfig {
  channelName: ChannelName;
  env: TelemetryEnv;
  appendServerlessChannelsSuffix: boolean;
}

export function getChannel(
  channelName: ChannelName,
  appendServerlessChannelsSuffix: boolean
): string {
  let channel: string;
  switch (channelName) {
    case 'snapshot':
      channel = TELEMETRY_CHANNELS.SNAPSHOT_CHANNEL;
      break;
    case 'optInStatus':
      channel = TELEMETRY_CHANNELS.OPT_IN_STATUS_CHANNEL;
      break;
    default:
      throw new Error(`Unknown telemetry channel ${channelName}.`);
  }

  return appendServerlessChannelsSuffix ? `${channel}-serverless` : channel;
}

export function getBaseUrl(env: TelemetryEnv): string {
  switch (env) {
    case 'prod':
      return ENDPOINT_PROD;
    case 'staging':
      return ENDPOINT_STAGING;
    default:
      throw new Error(`Unknown telemetry endpoint env ${env}.`);
  }
}

export function getTelemetryChannelEndpoint({
  channelName,
  env,
  appendServerlessChannelsSuffix,
}: GetTelemetryChannelEndpointConfig): string {
  const baseUrl = getBaseUrl(env);
  const channelPath = getChannel(channelName, appendServerlessChannelsSuffix);

  return `${baseUrl}${ENDPOINT_VERSION}/send/${channelPath}`;
}
