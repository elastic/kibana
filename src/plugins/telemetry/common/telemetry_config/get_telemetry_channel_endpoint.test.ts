/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getTelemetryChannelEndpoint,
  getChannel,
  getBaseUrl,
} from './get_telemetry_channel_endpoint';

describe('getBaseUrl', () => {
  it('throws on unknown env', () => {
    expect(() =>
      // @ts-expect-error
      getBaseUrl('ANY')
    ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry endpoint env ANY."`);
  });

  it('returns correct prod base url', () => {
    const baseUrl = getBaseUrl('prod');
    expect(baseUrl).toMatchInlineSnapshot(`"https://telemetry.elastic.co/"`);
  });

  it('returns correct staging base url', () => {
    const baseUrl = getBaseUrl('staging');
    expect(baseUrl).toMatchInlineSnapshot(`"https://telemetry-staging.elastic.co/"`);
  });
});

describe('getChannel', () => {
  it('throws on unknown channel', () => {
    expect(() =>
      // @ts-expect-error
      getChannel('ANY')
    ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry channel ANY."`);
  });

  it('returns correct snapshot channel name', () => {
    const channelName = getChannel('snapshot');
    expect(channelName).toMatchInlineSnapshot(`"xpack"`);
  });

  it('returns correct optInStatus channel name', () => {
    const channelName = getChannel('optInStatus');
    expect(channelName).toMatchInlineSnapshot(`"opt_in_status"`);
  });
});

describe('getTelemetryChannelEndpoint', () => {
  it('throws on unknown env', () => {
    expect(() =>
      // @ts-expect-error
      getTelemetryChannelEndpoint({ env: 'ANY', channelName: 'snapshot' })
    ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry endpoint env ANY."`);
  });

  it('throws on unknown channelName', () => {
    expect(() =>
      // @ts-expect-error
      getTelemetryChannelEndpoint({ env: 'prod', channelName: 'ANY' })
    ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry channel ANY."`);
  });

  describe('snapshot channel', () => {
    it('returns correct prod endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'prod', channelName: 'snapshot' });
      expect(endpoint).toMatchInlineSnapshot(`"https://telemetry.elastic.co/xpack/v2/send"`);
    });
    it('returns correct staging endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'staging', channelName: 'snapshot' });
      expect(endpoint).toMatchInlineSnapshot(
        `"https://telemetry-staging.elastic.co/xpack/v2/send"`
      );
    });
  });

  describe('optInStatus channel', () => {
    it('returns correct prod endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'prod', channelName: 'optInStatus' });
      expect(endpoint).toMatchInlineSnapshot(
        `"https://telemetry.elastic.co/opt_in_status/v2/send"`
      );
    });
    it('returns correct staging endpoint', () => {
      const endpoint = getTelemetryChannelEndpoint({ env: 'staging', channelName: 'optInStatus' });
      expect(endpoint).toMatchInlineSnapshot(
        `"https://telemetry-staging.elastic.co/opt_in_status/v2/send"`
      );
    });
  });
});
