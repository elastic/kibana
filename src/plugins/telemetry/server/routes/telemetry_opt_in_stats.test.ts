/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
