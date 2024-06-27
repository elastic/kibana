/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { transformRawCounter, createCounterFetcher } from './counters';
import { rawCounters } from './__fixtures__/counters_saved_objects';

describe('transformRawCounter', () => {
  it('transforms usage counters savedObject raw entries', () => {
    const result = rawCounters.map(transformRawCounter);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "counterName": "my_event",
          "counterType": "count",
          "domainId": "myApp",
          "fromTimestamp": "2021-04-09T00:00:00Z",
          "lastUpdatedAt": "2021-04-09T08:17:57.693Z",
          "total": 1,
        },
        Object {
          "counterName": "intersecting_event",
          "counterType": "loaded",
          "domainId": "Kibana_home",
          "fromTimestamp": "2020-10-23T00:00:00Z",
          "lastUpdatedAt": "2020-10-23T11:27:57.067Z",
          "total": 60,
        },
        undefined,
        undefined,
        Object {
          "counterName": "my_event_4457914848544_2",
          "counterType": "count",
          "domainId": "myApp",
          "fromTimestamp": "2021-04-09T00:00:00Z",
          "lastUpdatedAt": "2021-04-09T08:18:03.031Z",
          "total": 8,
        },
        Object {
          "counterName": "only_reported_in_usage_counters",
          "counterType": "count",
          "domainId": "myApp",
          "fromTimestamp": "2021-04-09T00:00:00Z",
          "lastUpdatedAt": "2021-04-09T08:18:03.031Z",
          "total": 1,
        },
        Object {
          "counterName": "namespaced_counter",
          "counterType": "count",
          "domainId": "myApp",
          "fromTimestamp": "2024-06-27T00:00:00Z",
          "lastUpdatedAt": "2024-06-27T08:18:03.031Z",
          "total": 1,
        },
        Object {
          "counterName": "namespaced_counter",
          "counterType": "count",
          "domainId": "myApp",
          "fromTimestamp": "2024-06-27T00:00:00Z",
          "lastUpdatedAt": "2024-06-27T09:18:03.031Z",
          "total": 2,
        },
        Object {
          "counterName": "namespaced_counter",
          "counterType": "count",
          "domainId": "myApp",
          "fromTimestamp": "2024-06-27T00:00:00Z",
          "lastUpdatedAt": "2024-06-27T10:18:03.031Z",
          "total": 3,
        },
        Object {
          "counterName": "namespaced_counter",
          "counterType": "count",
          "domainId": "myApp",
          "fromTimestamp": "2024-06-27T00:00:00Z",
          "lastUpdatedAt": "2024-06-27T11:18:03.031Z",
          "total": 10,
        },
      ]
    `);
  });
});

describe('createCounterFetcher', () => {
  const soClientMock = savedObjectsClientMock.create();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns saved objects only from usage_counters saved objects', async () => {
    // @ts-expect-error incomplete mock implementation
    soClientMock.find.mockImplementation(async ({ type }) => {
      switch (type) {
        case 'foo-counters':
          return { saved_objects: rawCounters };
        default:
          throw new Error(`unexpected type ${type}`);
      }
    });

    const fetch = createCounterFetcher('foo-counters', (dailyEvents) => ({ dailyEvents }));
    // @ts-expect-error incomplete mock implementation
    const { dailyEvents } = await fetch({ soClient: soClientMock });
    expect(dailyEvents).toHaveLength(5);
    const intersectingEntry = dailyEvents.find(
      ({ counterName, fromTimestamp }) =>
        counterName === 'intersecting_event' && fromTimestamp === '2020-10-23T00:00:00Z'
    );

    const onlyFromUICountersEntry = dailyEvents.find(
      ({ counterName }) => counterName === 'only_reported_in_ui_counters'
    );

    const onlyFromUsageCountersEntry = dailyEvents.find(
      ({ counterName }) => counterName === 'only_reported_in_usage_counters'
    );

    const invalidCountEntry = dailyEvents.find(
      ({ counterName }) => counterName === 'my_event_malformed'
    );

    const zeroCountEntry = dailyEvents.find(
      ({ counterName }) => counterName === 'my_event_4457914848544'
    );

    const nonUiCountersEntry = dailyEvents.find(
      ({ counterName }) => counterName === 'some_event_name'
    );

    const namespacedCounterEntry = dailyEvents.find(
      ({ counterName }) => counterName === 'namespaced_counter'
    );

    expect(invalidCountEntry).toBe(undefined);
    expect(nonUiCountersEntry).toBe(undefined);
    expect(zeroCountEntry).toBe(undefined);
    expect(onlyFromUICountersEntry).toBe(undefined);
    expect(onlyFromUsageCountersEntry).toMatchInlineSnapshot(`
      Object {
        "counterName": "only_reported_in_usage_counters",
        "counterType": "count",
        "domainId": "myApp",
        "fromTimestamp": "2021-04-09T00:00:00Z",
        "lastUpdatedAt": "2021-04-09T08:18:03.031Z",
        "total": 1,
      }
    `);
    expect(intersectingEntry).toMatchInlineSnapshot(`
      Object {
        "counterName": "intersecting_event",
        "counterType": "loaded",
        "domainId": "Kibana_home",
        "fromTimestamp": "2020-10-23T00:00:00Z",
        "lastUpdatedAt": "2020-10-23T11:27:57.067Z",
        "total": 60,
      }
    `);
    // we sum counters from all namespaces: 1 + 2 + 3 + 10
    expect(namespacedCounterEntry).toMatchInlineSnapshot(`
      Object {
        "counterName": "namespaced_counter",
        "counterType": "count",
        "domainId": "myApp",
        "fromTimestamp": "2024-06-27T00:00:00Z",
        "lastUpdatedAt": "2024-06-27T11:18:03.031Z",
        "total": 16,
      }
    `);
  });
});
