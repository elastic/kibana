/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AnalyticsClientInitContext } from '../../../analytics_client';
import type { Event } from '../../../events';
import { fetchMock } from './server_shipper.test.mocks';
import { ElasticV3ServerShipper } from './server_shipper';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { firstValueFrom } from 'rxjs';

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

  beforeEach(() => {
    jest.useFakeTimers();

    shipper = new ElasticV3ServerShipper(
      { version: '1.2.3', channelName: 'test-channel', debug: true },
      initContext
    );
  });

  afterEach(() => {
    shipper.shutdown();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('set optIn should update the isOptedIn$ observable', () => {
    // eslint-disable-next-line dot-notation
    const getInternalOptIn = () => shipper['isOptedIn'];

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

  test(
    'calls to reportEvents do not call `fetch` after 10 minutes because no optIn value is set yet',
    fakeSchedulers((advance) => {
      shipper.reportEvents(events);
      advance(10 * MINUTES);
      expect(fetchMock).not.toHaveBeenCalled();
    })
  );

  test(
    'calls to reportEvents call `fetch` after 10 minutes when optIn value is set to true',
    fakeSchedulers(async (advance) => {
      shipper.reportEvents(events);
      shipper.optIn(true);
      const counter = firstValueFrom(shipper.telemetryCounter$);
      advance(10 * MINUTES);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/test-channel',
        {
          body: '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"test-event-type","context":{},"properties":{}}\n',
          headers: {
            'content-type': 'application/x-njson',
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
          'content-type': 'application/x-njson',
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

  test(
    'does not add the query.debug: true property to the request if the shipper is not set with the debug flag',
    fakeSchedulers((advance) => {
      shipper = new ElasticV3ServerShipper(
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
            'content-type': 'application/x-njson',
            'x-elastic-cluster-id': 'UNKNOWN',
            'x-elastic-stack-version': '1.2.3',
          },
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
            'content-type': 'application/x-njson',
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
            'content-type': 'application/x-njson',
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
    })
  );
});
