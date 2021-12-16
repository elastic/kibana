/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
}

export function getChannel(channelName: ChannelName): string {
  switch (channelName) {
    case 'snapshot':
      return TELEMETRY_CHANNELS.SNAPSHOT_CHANNEL;
    case 'optInStatus':
      return TELEMETRY_CHANNELS.OPT_IN_STATUS_CHANNEL;
    default:
      throw new Error(`Unknown telemetry channel ${channelName}.`);
  }
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
}: GetTelemetryChannelEndpointConfig): string {
  const baseUrl = getBaseUrl(env);
  const channelPath = getChannel(channelName);

  return `${baseUrl}${channelPath}/${ENDPOINT_VERSION}/send`;
}
