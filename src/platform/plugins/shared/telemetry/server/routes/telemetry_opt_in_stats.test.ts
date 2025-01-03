/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('node-fetch');
import fetch from 'node-fetch';
import { sendTelemetryOptInStatus } from './telemetry_opt_in_stats';
import { StatsGetterConfig } from '@kbn/telemetry-collection-manager-plugin/server';

describe('sendTelemetryOptInStatus', () => {
  const mockClusterUuid = 'mk_uuid';
  const mockStatsGetterConfig = { unencrypted: false } as StatsGetterConfig;
  const mockTelemetryCollectionManager = {
    getOptInStats: jest
      .fn()
      .mockResolvedValue([{ clusterUuid: mockClusterUuid, stats: 'mock_opt_in_hashed_value' }]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fetch with the opt in status returned from the telemetryCollectionManager', async () => {
    const mockConfig = {
      appendServerlessChannelsSuffix: false,
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
    expect((fetch as jest.MockedFunction<typeof fetch>).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://telemetry.elastic.co/v3/send/kibana-opt-in-reports",
        Object {
          "body": "mock_opt_in_hashed_value",
          "headers": Object {
            "Content-Type": "application/json",
            "X-Elastic-Cluster-ID": "mk_uuid",
            "X-Elastic-Content-Encoding": "aes256gcm",
            "X-Elastic-Stack-Version": "mock_kibana_version",
          },
          "method": "post",
        },
      ]
    `);
  });

  it('sends to staging endpoint on "sendUsageTo: staging"', async () => {
    const mockConfig = {
      appendServerlessChannelsSuffix: false,
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
    expect((fetch as jest.MockedFunction<typeof fetch>).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://telemetry-staging.elastic.co/v3/send/kibana-opt-in-reports",
        Object {
          "body": "mock_opt_in_hashed_value",
          "headers": Object {
            "Content-Type": "application/json",
            "X-Elastic-Cluster-ID": "mk_uuid",
            "X-Elastic-Content-Encoding": "aes256gcm",
            "X-Elastic-Stack-Version": "mock_kibana_version",
          },
          "method": "post",
        },
      ]
    `);
  });
});
