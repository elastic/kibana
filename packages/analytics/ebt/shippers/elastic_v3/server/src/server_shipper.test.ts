/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { firstValueFrom } from 'rxjs';
import type { AnalyticsClientInitContext, Event } from '../../../../client';
import { fetchMock } from './server_shipper.test.mocks';
import { ElasticV3ServerShipper } from './server_shipper';

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

describe('ElasticV3ServerShipper', () => {
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

  let shipper: ElasticV3ServerShipper;

  // eslint-disable-next-line dot-notation
  const setLastBatchSent = (ms: number) => (shipper['lastBatchSent'] = ms);

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false });

    shipper = new ElasticV3ServerShipper(
      { version: '1.2.3', channelName: 'test-channel', debug: true },
      initContext
    );
    // eslint-disable-next-line dot-notation
    shipper['firstTimeOffline'] = null; // The tests think connectivity is OK initially for easier testing.
  });

  afterEach(() => {
    shipper.shutdown();
    jest.clearAllMocks();
  });

  test('set optIn should update the isOptedIn$ observable', () => {
    // eslint-disable-next-line dot-notation
    const getInternalOptIn = () => shipper['isOptedIn$'].value;

    // Initially undefined
    expect(getInternalOptIn()).toBeUndefined();

    shipper.optIn(true);
    expect(getInternalOptIn()).toBe(true);

    shipper.optIn(false);
    expect(getInternalOptIn()).toBe(false);
  });

  test('clears the queue after optIn: false', () => {
    shipper.reportEvents(events);
    // eslint-disable-next-line dot-notation
    expect(shipper['internalQueue'].length).toBe(1);

    shipper.optIn(false);
    // eslint-disable-next-line dot-notation
    expect(shipper['internalQueue'].length).toBe(0);
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

  test('calls to reportEvents do not call `fetch` straight away', () => {
    shipper.reportEvents(events);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('calls to reportEvents do not call `fetch` after 10 minutes because no optIn value is set yet', async () => {
    shipper.reportEvents(events);
    await jest.advanceTimersByTimeAsync(10 * MINUTES);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('calls to reportEvents call `fetch` after 10 seconds when optIn value is set to true', async () => {
    shipper.reportEvents(events);
    shipper.optIn(true);
    const counter = firstValueFrom(shipper.telemetryCounter$);
    setLastBatchSent(Date.now() - 10 * SECONDS);
    await jest.advanceTimersByTimeAsync(1 * SECONDS); // Moving 1 second should be enough to trigger the logic
    expect(fetchMock).toHaveBeenCalledWith(
      'https://telemetry-staging.elastic.co/v3/send/test-channel',
      {
        body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
        headers: {
          'content-type': 'application/x-ndjson',
          'x-elastic-cluster-id': 'UNKNOWN',
          'x-elastic-stack-version': '1.2.3',
        },
        method: 'POST',
        query: { debug: true },
      }
    );
    await expect(counter).resolves.toMatchInlineSnapshot(`
        Object {
          "code": "200",
          "count": 1,
          "event_type": "test-event-type",
          "source": "elastic_v3_server",
          "type": "succeeded",
        }
      `);
  });

  test('calls to reportEvents do not call `fetch` after 10 seconds when optIn value is set to false', async () => {
    shipper.reportEvents(events);
    shipper.optIn(false);
    setLastBatchSent(Date.now() - 10 * SECONDS);
    await jest.advanceTimersByTimeAsync(1 * SECONDS); // Moving 1 second should be enough to trigger the logic
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('calls to reportEvents call `fetch` when shutting down if optIn value is set to true', async () => {
    shipper.reportEvents(events);
    shipper.optIn(true);
    const counter = firstValueFrom(shipper.telemetryCounter$);
    shipper.shutdown();
    jest.advanceTimersToNextTimer(); // We are handling the shutdown in a promise, so we need to wait for the next tick.
    expect(fetchMock).toHaveBeenCalledWith(
      'https://telemetry-staging.elastic.co/v3/send/test-channel',
      {
        body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
        headers: {
          'content-type': 'application/x-ndjson',
          'x-elastic-cluster-id': 'UNKNOWN',
          'x-elastic-stack-version': '1.2.3',
        },
        method: 'POST',
        query: { debug: true },
      }
    );
    await expect(counter).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "200",
        "count": 1,
        "event_type": "test-event-type",
        "source": "elastic_v3_server",
        "type": "succeeded",
      }
    `);
  });

  test('does not add the query.debug: true property to the request if the shipper is not set with the debug flag', async () => {
    shipper = new ElasticV3ServerShipper(
      { version: '1.2.3', channelName: 'test-channel' },
      initContext
    );
    // eslint-disable-next-line dot-notation
    shipper['firstTimeOffline'] = null;
    shipper.reportEvents(events);
    shipper.optIn(true);
    setLastBatchSent(Date.now() - 10 * SECONDS);
    await jest.advanceTimersByTimeAsync(1 * SECONDS); // Moving 1 second should be enough to trigger the logic
    expect(fetchMock).toHaveBeenCalledWith(
      'https://telemetry-staging.elastic.co/v3/send/test-channel',
      {
        body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
        headers: {
          'content-type': 'application/x-ndjson',
          'x-elastic-cluster-id': 'UNKNOWN',
          'x-elastic-stack-version': '1.2.3',
        },
        method: 'POST',
      }
    );
  });

  test('sends when the queue overflows the 10kB leaky bucket one batch every 10s', async () => {
    expect.assertions(2 * 9 + 2);

    shipper.reportEvents(new Array(1000).fill(events[0]));
    shipper.optIn(true);

    // Due to the size of the test events, it matches 8 rounds.
    for (let i = 0; i < 9; i++) {
      const counter = firstValueFrom(shipper.telemetryCounter$);
      setLastBatchSent(Date.now() - 10 * SECONDS);
      await jest.advanceTimersByTimeAsync(1 * SECONDS); // Moving 1 second should be enough to trigger the logic
      expect(fetchMock).toHaveBeenNthCalledWith(
        i + 1,
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: new Array(103)
            .fill(
              '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n'
            )
            .join(''),
          headers: {
            'content-type': 'application/x-ndjson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
          method: 'POST',
          query: { debug: true },
        }
      );
      await expect(counter).resolves.toMatchInlineSnapshot(`
          Object {
            "code": "200",
            "count": 103,
            "event_type": "test-event-type",
            "source": "elastic_v3_server",
            "type": "succeeded",
          }
        `);
      jest.advanceTimersToNextTimer();
    }
    // eslint-disable-next-line dot-notation
    expect(shipper['internalQueue'].length).toBe(1000 - 9 * 103); // 73

    // If we call it again, it should not enqueue all the events (only the ones to fill the queue):
    shipper.reportEvents(new Array(1000).fill(events[0]));
    // eslint-disable-next-line dot-notation
    expect(shipper['internalQueue'].length).toBe(1000);
  });

  test('handles when the fetch request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
    shipper.reportEvents(events);
    shipper.optIn(true);
    const counter = firstValueFrom(shipper.telemetryCounter$);
    setLastBatchSent(Date.now() - 10 * SECONDS);
    await jest.advanceTimersByTimeAsync(1 * SECONDS); // Moving 1 second should be enough to trigger the logic
    expect(fetchMock).toHaveBeenCalledWith(
      'https://telemetry-staging.elastic.co/v3/send/test-channel',
      {
        body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
        headers: {
          'content-type': 'application/x-ndjson',
          'x-elastic-cluster-id': 'UNKNOWN',
          'x-elastic-stack-version': '1.2.3',
        },
        method: 'POST',
        query: { debug: true },
      }
    );
    await expect(counter).resolves.toMatchInlineSnapshot(`
        Object {
          "code": "Failed to fetch",
          "count": 1,
          "event_type": "test-event-type",
          "source": "elastic_v3_server",
          "type": "failed",
        }
      `);
  });

  test('handles when the fetch request fails (request completes but not OK response)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"status": "not ok"}'),
    });
    shipper.reportEvents(events);
    shipper.optIn(true);
    const counter = firstValueFrom(shipper.telemetryCounter$);
    setLastBatchSent(Date.now() - 10 * SECONDS);
    await jest.advanceTimersByTimeAsync(1 * SECONDS); // Moving 1 second should be enough to trigger the logic
    expect(fetchMock).toHaveBeenCalledWith(
      'https://telemetry-staging.elastic.co/v3/send/test-channel',
      {
        body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
        headers: {
          'content-type': 'application/x-ndjson',
          'x-elastic-cluster-id': 'UNKNOWN',
          'x-elastic-stack-version': '1.2.3',
        },
        method: 'POST',
        query: { debug: true },
      }
    );
    await expect(counter).resolves.toMatchInlineSnapshot(`
        Object {
          "code": "400",
          "count": 1,
          "event_type": "test-event-type",
          "source": "elastic_v3_server",
          "type": "failed",
        }
      `);
  });

  describe('Connectivity Checks', () => {
    describe('connectivity check when connectivity is confirmed (firstTimeOffline === null)', () => {
      test.each([undefined, false, true])('does not run for opt-in %p', async (optInValue) => {
        if (optInValue !== undefined) {
          shipper.optIn(optInValue);
        }

        // From the start, it doesn't check connectivity because already confirmed
        expect(fetchMock).not.toHaveBeenCalledWith(
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );

        // Wait a big time (1 minute should be enough, but for the sake of tests...)
        await jest.advanceTimersByTimeAsync(10 * MINUTES);

        expect(fetchMock).not.toHaveBeenCalledWith(
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
      });
    });

    describe('connectivity check with initial unknown state of the connectivity', () => {
      beforeEach(() => {
        // eslint-disable-next-line dot-notation
        shipper['firstTimeOffline'] = undefined; // Initial unknown state of the connectivity
      });

      test.each([undefined, false])('does not run for opt-in %p', async (optInValue) => {
        if (optInValue !== undefined) {
          shipper.optIn(optInValue);
        }

        // From the start, it doesn't check connectivity because already confirmed
        expect(fetchMock).not.toHaveBeenCalledWith(
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );

        // Wait a big time (1 minute should be enough, but for the sake of tests...)
        await jest.advanceTimersByTimeAsync(10 * MINUTES);

        expect(fetchMock).not.toHaveBeenCalledWith(
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
      });

      test('runs as soon as opt-in is set to true', () => {
        shipper.optIn(true);

        // From the start, it doesn't check connectivity because opt-in is not true
        expect(fetchMock).toHaveBeenNthCalledWith(
          1,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
      });
    });

    describe('connectivity check with the connectivity confirmed to be faulty', () => {
      beforeEach(() => {
        // eslint-disable-next-line dot-notation
        shipper['firstTimeOffline'] = 100; // Failed at some point
      });

      test.each([undefined, false])('does not run for opt-in %p', async (optInValue) => {
        if (optInValue !== undefined) {
          shipper.optIn(optInValue);
        }

        // From the start, it doesn't check connectivity because already confirmed
        expect(fetchMock).not.toHaveBeenCalledWith(
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );

        // Wait a big time (1 minute should be enough, but for the sake of tests...)
        await jest.advanceTimersByTimeAsync(10 * MINUTES);

        expect(fetchMock).not.toHaveBeenCalledWith(
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
      });

      test('runs as soon as opt-in is set to true', () => {
        shipper.optIn(true);

        // From the start, it doesn't check connectivity because opt-in is not true
        expect(fetchMock).toHaveBeenNthCalledWith(
          1,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
      });
    });

    describe('after report failure', () => {
      // generate the report failure for each test
      beforeEach(async () => {
        fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
        shipper.reportEvents(events);
        shipper.optIn(true);
        const counter = firstValueFrom(shipper.telemetryCounter$);
        setLastBatchSent(Date.now() - 10 * SECONDS);
        await jest.advanceTimersByTimeAsync(1 * SECONDS); // Moving 1 second should be enough to trigger the logic
        expect(fetchMock).toHaveBeenNthCalledWith(
          1,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          {
            body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
            headers: {
              'content-type': 'application/x-ndjson',
              'x-elastic-cluster-id': 'UNKNOWN',
              'x-elastic-stack-version': '1.2.3',
            },
            method: 'POST',
            query: { debug: true },
          }
        );
        await expect(counter).resolves.toMatchInlineSnapshot(`
          Object {
            "code": "Failed to fetch",
            "count": 1,
            "event_type": "test-event-type",
            "source": "elastic_v3_server",
            "type": "failed",
          }
        `);
      });

      test('connectivity check runs periodically', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
        await jest.advanceTimersByTimeAsync(1 * MINUTES);
        expect(fetchMock).toHaveBeenNthCalledWith(
          2,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
        fetchMock.mockResolvedValueOnce({ ok: false });
        await jest.advanceTimersByTimeAsync(2 * MINUTES);
        expect(fetchMock).toHaveBeenNthCalledWith(
          3,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
      });
    });

    describe('after being offline for longer than 24h', () => {
      beforeEach(() => {
        shipper.optIn(true);
        shipper.reportEvents(events);
        // eslint-disable-next-line dot-notation
        expect(shipper['internalQueue'].length).toBe(1);
        // eslint-disable-next-line dot-notation
        shipper['firstTimeOffline'] = 100;
      });

      test('the following connectivity check clears the queue', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
        await jest.advanceTimersByTimeAsync(1 * MINUTES);
        expect(fetchMock).toHaveBeenNthCalledWith(
          1,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
        // eslint-disable-next-line dot-notation
        expect(shipper['internalQueue'].length).toBe(0);
      });

      test('new events are not added to the queue', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
        await jest.advanceTimersByTimeAsync(1 * MINUTES);
        expect(fetchMock).toHaveBeenNthCalledWith(
          1,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
        // eslint-disable-next-line dot-notation
        expect(shipper['internalQueue'].length).toBe(0);

        shipper.reportEvents(events);
        // eslint-disable-next-line dot-notation
        expect(shipper['internalQueue'].length).toBe(0);
      });

      test('regains the connection', async () => {
        fetchMock.mockResolvedValueOnce({ ok: true });
        await jest.advanceTimersByTimeAsync(1 * MINUTES);
        expect(fetchMock).toHaveBeenNthCalledWith(
          1,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
        // eslint-disable-next-line dot-notation
        expect(shipper['firstTimeOffline']).toBe(null);

        await jest.advanceTimersByTimeAsync(10 * MINUTES);
        expect(fetchMock).not.toHaveBeenNthCalledWith(
          2,
          'https://telemetry-staging.elastic.co/v3/send/test-channel',
          { method: 'OPTIONS' }
        );
      });
    });
  });

  describe('flush method', () => {
    test('resolves straight away if it should not send anything', async () => {
      await expect(shipper.flush()).resolves.toBe(undefined);
    });

    test('resolves when all the ongoing requests are complete', async () => {
      shipper.optIn(true);
      shipper.reportEvents(events);
      expect(fetchMock).toHaveBeenCalledTimes(0);
      fetchMock.mockImplementation(async () => {
        // eslint-disable-next-line dot-notation
        expect(shipper['inFlightRequests$'].value).toBe(1);
      });
      await expect(shipper.flush()).resolves.toBe(undefined);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
          headers: {
            'content-type': 'application/x-ndjson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
          method: 'POST',
          query: { debug: true },
        }
      );
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
  });
});
