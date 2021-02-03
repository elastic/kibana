/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getTelemetrySendUsageFrom } from './get_telemetry_send_usage_from';
import { TelemetrySavedObject } from './types';

describe('getTelemetrySendUsageFrom', () => {
  it('returns kibana.yml config when saved object not found', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedObjectNotFound: true,
      configSendUsageFrom: 'browser',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('browser');
  });

  it('returns kibana.yml config when saved object forbidden', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedObjectForbidden: true,
      configSendUsageFrom: 'browser',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('browser');
  });

  it('returns kibana.yml config when saved object sendUsageFrom is undefined', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedSendUsagefrom: undefined,
      configSendUsageFrom: 'server',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('server');
  });
});

interface CallGetTelemetryUsageFetcherParams {
  savedObjectNotFound?: boolean;
  savedObjectForbidden?: boolean;
  savedSendUsagefrom?: 'browser' | 'server';
  configSendUsageFrom: 'browser' | 'server';
}

function callGetTelemetryUsageFetcher(params: CallGetTelemetryUsageFetcherParams) {
  const telemetrySavedObject = getMockTelemetrySavedObject(params);
  const configTelemetrySendUsageFrom = params.configSendUsageFrom;
  return getTelemetrySendUsageFrom({ configTelemetrySendUsageFrom, telemetrySavedObject });
}

function getMockTelemetrySavedObject(
  params: CallGetTelemetryUsageFetcherParams
): TelemetrySavedObject {
  const { savedObjectNotFound, savedObjectForbidden } = params;
  if (savedObjectForbidden) {
    return false;
  }
  if (savedObjectNotFound) {
    return null;
  }

  return {
    sendUsageFrom: params.savedSendUsagefrom,
  };
}
