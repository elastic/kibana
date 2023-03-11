/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AnalyticsClientInitContext, Event } from '@kbn/analytics-client';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { firstValueFrom } from 'rxjs';
import { ElasticV3BrowserShipper } from './browser_shipper';

describe('ElasticV3BrowserShipper', () => {
  const events: Event[] = [
    {
      timestamp: '2020-01-01T00:00:00.000Z',
      event_type: 'test-event-type',
      context: {},
      properties: {},
    },
  ];

  const initContext: AnalyticsClientInitContext = {
    sendTo: 'staging',
    isDev: true,
    logger: loggerMock.create(),
  };

  let shipper: ElasticV3BrowserShipper;

  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });

    fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve('{"status": "ok"}'),
    });

    Object.defineProperty(global, 'fetch', {
      value: fetchMock,
      writable: true,
    });

    shipper = new ElasticV3BrowserShipper(
      { version: '1.2.3', channelName: 'test-channel', debug: true },
      initContext
    );
  });

  afterEach(() => {
    shipper.shutdown();
    jest.useRealTimers();
  });

  test("custom sendTo overrides Analytics client's", () => {
    const prodShipper = new ElasticV3BrowserShipper(
      { version: '1.2.3', channelName: 'test-channel', debug: true, sendTo: 'production' },
      initContext
    );

    // eslint-disable-next-line dot-notation
    expect(prodShipper['url']).not.toEqual(shipper['url']);
  });

  test('set optIn should update the isOptedIn$ observable', () => {
    // eslint-disable-next-line dot-notation
    const internalOptIn$ = shipper['isOptedIn$'];

    // Initially undefined
    expect(internalOptIn$.value).toBeUndefined();

    shipper.optIn(true);
    expect(internalOptIn$.value).toBe(true);

    shipper.optIn(false);
    expect(internalOptIn$.value).toBe(false);
  });

  test('set extendContext should store local values: clusterUuid and licenseId', () => {
    // eslint-disable-next-line dot-notation
    const getInternalClusterUuid = () => shipper['clusterUuid'];
    // eslint-disable-next-line dot-notation
    const getInternalLicenseId = () => shipper['licenseId'];

    // Initial values
    expect(getInternalClusterUuid()).toBe('UNKNOWN');
    expect(getInternalLicenseId()).toBeUndefined();

    shipper.extendContext({ cluster_uuid: 'test-cluster-uuid' });
    expect(getInternalClusterUuid()).toBe('test-cluster-uuid');
    expect(getInternalLicenseId()).toBeUndefined();

    shipper.extendContext({ license_id: 'test-license-id' });
    expect(getInternalClusterUuid()).toBe('test-cluster-uuid');
    expect(getInternalLicenseId()).toBe('test-license-id');

    shipper.extendContext({ cluster_uuid: 'test-cluster-uuid-2', license_id: 'test-license-id-2' });
    expect(getInternalClusterUuid()).toBe('test-cluster-uuid-2');
    expect(getInternalLicenseId()).toBe('test-license-id-2');
  });

  test('calls to reportEvents do not call `fetch` straight away (buffer of 1s)', () => {
    shipper.reportEvents(events);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test(
    'calls to reportEvents do not call `fetch` after 1s because no optIn value is set yet',
    fakeSchedulers((advance) => {
      shipper.reportEvents(events);
      advance(1000);
      expect(fetchMock).not.toHaveBeenCalled();
    })
  );

  test(
    'calls to reportEvents call `fetch` after 1s when optIn value is set to true',
    fakeSchedulers(async (advance) => {
      shipper.reportEvents(events);
      shipper.optIn(true);
      const counter = firstValueFrom(shipper.telemetryCounter$);
      advance(1000);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
          headers: {
            'content-type': 'application/x-ndjson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
          keepalive: true,
          method: 'POST',
          query: { debug: true },
        }
      );
      await expect(counter).resolves.toMatchInlineSnapshot(`
        Object {
          "code": "200",
          "count": 1,
          "event_type": "test-event-type",
          "source": "elastic_v3_browser",
          "type": "succeeded",
        }
      `);
    })
  );

  test(
    'calls to reportEvents do not call `fetch` after 1s when optIn value is set to false',
    fakeSchedulers((advance) => {
      shipper.reportEvents(events);
      shipper.optIn(false);
      advance(1000);
      expect(fetchMock).not.toHaveBeenCalled();
    })
  );

  test(
    'calls to flush forces the client to send all the pending events',
    fakeSchedulers(async (advance) => {
      shipper.optIn(true);
      shipper.reportEvents(events);
      const counter = firstValueFrom(shipper.telemetryCounter$);
      const promise = shipper.flush();
      advance(0); // bufferWhen requires some sort of fake scheduling to advance (but we are not advancing 1s)
      await promise;
      expect(fetchMock).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
          headers: {
            'content-type': 'application/x-ndjson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
          keepalive: true,
          method: 'POST',
          query: { debug: true },
        }
      );
      await expect(counter).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "200",
        "count": 1,
        "event_type": "test-event-type",
        "source": "elastic_v3_browser",
        "type": "succeeded",
      }
    `);
    })
  );

  test('calls to flush resolve immediately if there is nothing to send', async () => {
    shipper.optIn(true);
    await shipper.flush();
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  test('calling flush multiple times does not keep hanging', async () => {
    await expect(shipper.flush()).resolves.toBe(undefined);
    await expect(shipper.flush()).resolves.toBe(undefined);
    await Promise.all([shipper.flush(), shipper.flush()]);
  });

  test('calling flush after shutdown does not keep hanging', async () => {
    shipper.shutdown();
    await expect(shipper.flush()).resolves.toBe(undefined);
  });

  test('calls to reportEvents call `fetch` when shutting down if optIn value is set to true', async () => {
    shipper.reportEvents(events);
    shipper.optIn(true);
    const counter = firstValueFrom(shipper.telemetryCounter$);
    shipper.shutdown();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://telemetry-staging.elastic.co/v3/send/test-channel',
      {
        body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
        headers: {
          'content-type': 'application/x-ndjson',
          'x-elastic-cluster-id': 'UNKNOWN',
          'x-elastic-stack-version': '1.2.3',
        },
        keepalive: true,
        method: 'POST',
        query: { debug: true },
      }
    );
    await expect(counter).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "200",
        "count": 1,
        "event_type": "test-event-type",
        "source": "elastic_v3_browser",
        "type": "succeeded",
      }
    `);
  });

  test(
    'does not add the query.debug: true property to the request if the shipper is not set with the debug flag',
    fakeSchedulers((advance) => {
      shipper = new ElasticV3BrowserShipper(
        { version: '1.2.3', channelName: 'test-channel' },
        initContext
      );
      shipper.reportEvents(events);
      shipper.optIn(true);
      advance(1000);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
          headers: {
            'content-type': 'application/x-ndjson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
          keepalive: true,
          method: 'POST',
        }
      );
    })
  );

  test(
    'handles when the fetch request fails',
    fakeSchedulers(async (advance) => {
      fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
      shipper.reportEvents(events);
      shipper.optIn(true);
      const counter = firstValueFrom(shipper.telemetryCounter$);
      advance(1000);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
          headers: {
            'content-type': 'application/x-ndjson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
          keepalive: true,
          method: 'POST',
          query: { debug: true },
        }
      );
      await expect(counter).resolves.toMatchInlineSnapshot(`
        Object {
          "code": "Failed to fetch",
          "count": 1,
          "event_type": "test-event-type",
          "source": "elastic_v3_browser",
          "type": "failed",
        }
      `);
    })
  );

  test(
    'handles when the fetch request fails (request completes but not OK response)',
    fakeSchedulers(async (advance) => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"status": "not ok"}'),
      });
      shipper.reportEvents(events);
      shipper.optIn(true);
      const counter = firstValueFrom(shipper.telemetryCounter$);
      advance(1000);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
          headers: {
            'content-type': 'application/x-ndjson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
          keepalive: true,
          method: 'POST',
          query: { debug: true },
        }
      );
      await expect(counter).resolves.toMatchInlineSnapshot(`
        Object {
          "code": "400",
          "count": 1,
          "event_type": "test-event-type",
          "source": "elastic_v3_browser",
          "type": "failed",
        }
      `);
    })
  );
});
