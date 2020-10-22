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

jest.mock('node-fetch');
// @ts-ignore
import fetch from 'node-fetch';
import { sendTelemetryOptInStatus } from './telemetry_opt_in_stats';
import { StatsGetterConfig } from 'src/plugins/telemetry_collection_manager/server';

describe('sendTelemetryOptInStatus', () => {
  it('calls fetch with the opt in status returned from the telemetryCollectionManager', async () => {
    const mockOptInStatus = ['mock_opt_in_hashed_value'];
    const mockTelemetryCollectionManager = {
      getOptInStats: jest.fn().mockResolvedValue(mockOptInStatus),
    };
    const mockConfig = {
      optInStatusUrl: 'some_url',
      newOptInStatus: true,
      currentKibanaVersion: 'mock_kibana_version',
    };
    const mockStatsGetterConfig = {
      unencrypted: false,
    };

    const result = await sendTelemetryOptInStatus(
      mockTelemetryCollectionManager,
      mockConfig,
      mockStatsGetterConfig as StatsGetterConfig
    );
    expect(result).toBeUndefined();
    expect(fetch).toBeCalledTimes(1);
    expect(fetch).toBeCalledWith(mockConfig.optInStatusUrl, {
      method: 'post',
      body: mockOptInStatus,
      headers: { 'X-Elastic-Stack-Version': mockConfig.currentKibanaVersion },
    });
  });
});
