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

import { getTelemetryUsageFetcher } from './get_telemetry_usage_fetcher';
import { TelemetrySavedObject } from '../telemetry_repository/get_telemetry_saved_object';

describe('getTelemetryUsageFetcher', () => {
  it('returns kibana.yml config when saved object not found', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedObjectNotFound: true,
      configUsageFetcher: 'browser',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('browser');
  });

  it('returns kibana.yml config when saved object forbidden', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedObjectForbidden: true,
      configUsageFetcher: 'browser',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('browser');
  });

  it('returns kibana.yml config when saved object usageFetcher is undefined', () => {
    const params: CallGetTelemetryUsageFetcherParams = {
      savedUsageFetcher: undefined,
      configUsageFetcher: 'server',
    };

    const result = callGetTelemetryUsageFetcher(params);

    expect(result).toBe('server');
  });
});

interface CallGetTelemetryUsageFetcherParams {
  savedObjectNotFound?: boolean;
  savedObjectForbidden?: boolean;
  savedUsageFetcher?: 'browser' | 'server' | undefined;
  configUsageFetcher: 'browser' | 'server';
}

function callGetTelemetryUsageFetcher(params: CallGetTelemetryUsageFetcherParams) {
  const telemetrySavedObject = getMockTelemetrySavedObject(params);
  const telemetryPluginConfig = getMockTelemetryPluginConfig(params);
  return getTelemetryUsageFetcher({ telemetryPluginConfig, telemetrySavedObject });
}

function getMockTelemetryPluginConfig(params: CallGetTelemetryUsageFetcherParams) {
  return {
    telemetryUsageFetcher: params.configUsageFetcher,
  };
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
    usageFetcher: params.savedUsageFetcher,
  };
}
