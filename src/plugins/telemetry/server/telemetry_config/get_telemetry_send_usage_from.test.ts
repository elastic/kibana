/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTelemetrySendUsageFrom } from './get_telemetry_send_usage_from';
import type { TelemetrySavedObject } from '../saved_objects';

describe('getTelemetrySendUsageFrom', () => {
  it('returns kibana.yml config when saved object not found', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedObjectNotFound: true,
      configSendUsageFrom: 'browser',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('browser');
  });

  it('returns kibana.yml config when saved object sendUsageFrom is undefined', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedSendUsageFrom: undefined,
      configSendUsageFrom: 'server',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('server');
  });
});

interface CallGetTelemetryUsageFetcherParams {
  savedObjectNotFound?: boolean;
  savedSendUsageFrom?: 'browser' | 'server';
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
  const { savedObjectNotFound } = params;
  if (savedObjectNotFound) {
    return {};
  }

  return {
    sendUsageFrom: params.savedSendUsageFrom,
  };
}
