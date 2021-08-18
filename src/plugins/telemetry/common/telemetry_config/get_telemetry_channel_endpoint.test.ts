/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTelemetryChannelEndpoint } from './get_telemetry_channel_endpoint';
import { TELEMETRY_ENDPOINT } from '../constants';

describe('getTelemetryChannelEndpoint', () => {
  it('throws on unknown env', () => {
    expect(() =>
      // @ts-expect-error
      getTelemetryChannelEndpoint({ env: 'ANY', channelName: 'main' })
    ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry endpoint env ANY."`);
  });

  it('throws on unknown channelName', () => {
    expect(() =>
      // @ts-expect-error
      getTelemetryChannelEndpoint({ env: 'prod', channelName: 'ANY' })
    ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry channel ANY."`);
  });

  describe('main channel', () => {
    it('returns correct prod endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'prod', channelName: 'main' });
      expect(endpoint).toBe(TELEMETRY_ENDPOINT.MAIN_CHANNEL.PROD);
    });
    it('returns correct staging endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'staging', channelName: 'main' });
      expect(endpoint).toBe(TELEMETRY_ENDPOINT.MAIN_CHANNEL.STAGING);
    });
  });

  describe('optInStatus channel', () => {
    it('returns correct prod endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'prod', channelName: 'optInStatus' });
      expect(endpoint).toBe(TELEMETRY_ENDPOINT.OPT_IN_STATUS_CHANNEL.PROD);
    });
    it('returns correct staging endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'staging', channelName: 'optInStatus' });
      expect(endpoint).toBe(TELEMETRY_ENDPOINT.OPT_IN_STATUS_CHANNEL.STAGING);
    });
  });
});
