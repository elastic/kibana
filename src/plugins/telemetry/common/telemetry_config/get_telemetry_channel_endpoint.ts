/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TELEMETRY_ENDPOINT } from '../constants';

export interface GetTelemetryChannelEndpointConfig {
  channelName: 'main' | 'optInStatus';
  env: 'staging' | 'prod';
}

export function getTelemetryChannelEndpoint({
  channelName,
  env,
}: GetTelemetryChannelEndpointConfig): string {
  if (env !== 'staging' && env !== 'prod') {
    throw new Error(`Unknown telemetry endpoint env ${env}.`);
  }

  const endpointEnv = env === 'staging' ? 'STAGING' : 'PROD';

  switch (channelName) {
    case 'main':
      return TELEMETRY_ENDPOINT.MAIN_CHANNEL[endpointEnv];
    case 'optInStatus':
      return TELEMETRY_ENDPOINT.OPT_IN_STATUS_CHANNEL[endpointEnv];
    default:
      throw new Error(`Unknown telemetry channel ${channelName}.`);
  }
}
