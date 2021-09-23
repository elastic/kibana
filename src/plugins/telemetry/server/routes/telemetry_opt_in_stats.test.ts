/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('node-fetch');
import fetch from 'node-fetch';
import { sendTelemetryOptInStatus } from './telemetry_opt_in_stats';
import { StatsGetterConfig } from 'src/plugins/telemetry_collection_manager/server';
import { TELEMETRY_ENDPOINT } from '../../common/constants';
describe('sendTelemetryOptInStatus', () => {
  const mockStatsGetterConfig = { unencrypted: false } as StatsGetterConfig;
  const mockTelemetryCollectionManager = {
    getOptInStats: jest.fn().mockResolvedValue(['mock_opt_in_hashed_value']),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fetch with the opt in status returned from the telemetryCollectionManager', async () => {
    const mockConfig = {
      sendUsageTo: 'prod' as const,
      newOptInStatus: true,
      currentKibanaVersion: 'mock_kibana_version',
    };

    const result = await sendTelemetryOptInStatus(
      mockTelemetryCollectionManager,
      mockConfig,
      mockStatsGetterConfig
    );
    expect(result).toBeUndefined();
    expect(fetch).toBeCalledTimes(1);
    expect(fetch).toBeCalledWith(TELEMETRY_ENDPOINT.OPT_IN_STATUS_CHANNEL.PROD, {
      method: 'post',
      body: '["mock_opt_in_hashed_value"]',
      headers: { 'X-Elastic-Stack-Version': mockConfig.currentKibanaVersion },
    });
  });

  it('sends to staging endpoint on "sendUsageTo: staging"', async () => {
    const mockConfig = {
      sendUsageTo: 'staging' as const,
      newOptInStatus: true,
      currentKibanaVersion: 'mock_kibana_version',
    };

    await sendTelemetryOptInStatus(
      mockTelemetryCollectionManager,
      mockConfig,
      mockStatsGetterConfig
    );

    expect(fetch).toBeCalledTimes(1);
    expect(fetch).toBeCalledWith(TELEMETRY_ENDPOINT.OPT_IN_STATUS_CHANNEL.STAGING, {
      method: 'post',
      body: '["mock_opt_in_hashed_value"]',
      headers: { 'X-Elastic-Stack-Version': mockConfig.currentKibanaVersion },
    });
  });
});
