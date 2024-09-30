/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  describe('Classic offering', () => {
    it('throws on unknown channel', () => {
      expect(() =>
        // @ts-expect-error
        getChannel('ANY', false)
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry channel ANY."`);
    });

    it('returns correct snapshot channel name', () => {
      const channelName = getChannel('snapshot', false);
      expect(channelName).toMatchInlineSnapshot(`"kibana-snapshot"`);
    });

    it('returns correct optInStatus channel name', () => {
      const channelName = getChannel('optInStatus', false);
      expect(channelName).toMatchInlineSnapshot(`"kibana-opt-in-reports"`);
    });
  });

  describe('Serverless offering', () => {
    it('throws on unknown channel', () => {
      expect(() =>
        // @ts-expect-error
        getChannel('ANY', true)
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry channel ANY."`);
    });

    it('returns correct snapshot channel name', () => {
      const channelName = getChannel('snapshot', true);
      expect(channelName).toMatchInlineSnapshot(`"kibana-snapshot-serverless"`);
    });

    it('returns correct optInStatus channel name', () => {
      const channelName = getChannel('optInStatus', true);
      expect(channelName).toMatchInlineSnapshot(`"kibana-opt-in-reports-serverless"`);
    });
  });
});

describe('getTelemetryChannelEndpoint', () => {
  describe('Classic offering', () => {
    it('throws on unknown env', () => {
      expect(() =>
        getTelemetryChannelEndpoint({
          // @ts-expect-error
          env: 'ANY',
          channelName: 'snapshot',
          appendServerlessChannelsSuffix: false,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry endpoint env ANY."`);
    });

    it('throws on unknown channelName', () => {
      expect(() =>
        getTelemetryChannelEndpoint({
          env: 'prod',
          // @ts-expect-error
          channelName: 'ANY',
          appendServerlessChannelsSuffix: false,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry channel ANY."`);
    });

    describe('snapshot channel', () => {
      it('returns correct prod endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'prod',
          channelName: 'snapshot',
          appendServerlessChannelsSuffix: false,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry.elastic.co/v3/send/kibana-snapshot"`
        );
      });
      it('returns correct staging endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'staging',
          channelName: 'snapshot',
          appendServerlessChannelsSuffix: false,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry-staging.elastic.co/v3/send/kibana-snapshot"`
        );
      });
    });

    describe('optInStatus channel', () => {
      it('returns correct prod endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'prod',
          channelName: 'optInStatus',
          appendServerlessChannelsSuffix: false,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry.elastic.co/v3/send/kibana-opt-in-reports"`
        );
      });
      it('returns correct staging endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'staging',
          channelName: 'optInStatus',
          appendServerlessChannelsSuffix: false,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry-staging.elastic.co/v3/send/kibana-opt-in-reports"`
        );
      });
    });
  });

  describe('Serverless offering', () => {
    it('throws on unknown env', () => {
      expect(() =>
        getTelemetryChannelEndpoint({
          // @ts-expect-error
          env: 'ANY',
          channelName: 'snapshot',
          appendServerlessChannelsSuffix: true,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry endpoint env ANY."`);
    });

    it('throws on unknown channelName', () => {
      expect(() =>
        getTelemetryChannelEndpoint({
          env: 'prod',
          // @ts-expect-error
          channelName: 'ANY',
          appendServerlessChannelsSuffix: true,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown telemetry channel ANY."`);
    });

    describe('snapshot channel', () => {
      it('returns correct prod endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'prod',
          channelName: 'snapshot',
          appendServerlessChannelsSuffix: true,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry.elastic.co/v3/send/kibana-snapshot-serverless"`
        );
      });
      it('returns correct staging endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'staging',
          channelName: 'snapshot',
          appendServerlessChannelsSuffix: true,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry-staging.elastic.co/v3/send/kibana-snapshot-serverless"`
        );
      });
    });

    describe('optInStatus channel', () => {
      it('returns correct prod endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'prod',
          channelName: 'optInStatus',
          appendServerlessChannelsSuffix: true,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry.elastic.co/v3/send/kibana-opt-in-reports-serverless"`
        );
      });
      it('returns correct staging endpoint', () => {
        const endpoint = getTelemetryChannelEndpoint({
          env: 'staging',
          channelName: 'optInStatus',
          appendServerlessChannelsSuffix: true,
        });
        expect(endpoint).toMatchInlineSnapshot(
          `"https://telemetry-staging.elastic.co/v3/send/kibana-opt-in-reports-serverless"`
        );
      });
    });
  });
});
