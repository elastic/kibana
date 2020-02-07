/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getTelemetrySendUsageFrom } from './get_telemetry_send_usage_from';
import { TelemetrySavedObject } from '../telemetry_repository/get_telemetry_saved_object';

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
