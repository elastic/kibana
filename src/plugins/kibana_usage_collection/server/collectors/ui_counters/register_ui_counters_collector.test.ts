/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformRawUsageCounterObject, fetchUiCounters } from './register_ui_counters_collector';
import { rawUsageCounters } from './__fixtures__/usage_counter_saved_objects';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '@kbn/usage-collection-plugin/server';

describe('transformRawUsageCounterObject', () => {
  it('transforms usage counters savedObject raw entries', () => {
    const result = rawUsageCounters.map(transformRawUsageCounterObject);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "appName": "myApp",
          "counterType": "count",
          "eventName": "my_event",
          "fromTimestamp": "2021-04-09T00:00:00Z",
          "lastUpdatedAt": "2021-04-09T08:17:57.693Z",
          "total": 1,
        },
        Object {
          "appName": "Kibana_home",
          "counterType": "loaded",
          "eventName": "intersecting_event",
          "fromTimestamp": "2020-10-23T00:00:00Z",
          "lastUpdatedAt": "2020-10-23T11:27:57.067Z",
          "total": 60,
        },
        undefined,
        undefined,
        undefined,
        Object {
          "appName": "myApp",
          "counterType": "count",
          "eventName": "my_event_4457914848544_2",
          "fromTimestamp": "2021-04-09T00:00:00Z",
          "lastUpdatedAt": "2021-04-09T08:18:03.031Z",
          "total": 8,
        },
        Object {
          "appName": "myApp",
          "counterType": "count",
          "eventName": "only_reported_in_usage_counters",
          "fromTimestamp": "2021-04-09T00:00:00Z",
          "lastUpdatedAt": "2021-04-09T08:18:03.031Z",
          "total": 1,
        },
      ]
    `);
  });
});

describe('fetchUiCounters', () => {
  const soClientMock = savedObjectsClientMock.create();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns saved objects only from usage_counters saved objects', async () => {
    // @ts-expect-error incomplete mock implementation
    soClientMock.find.mockImplementation(async ({ type }) => {
      switch (type) {
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return { saved_objects: rawUsageCounters };
        default:
          throw new Error(`unexpected type ${type}`);
      }
    });

    // @ts-expect-error incomplete mock implementation
    const { dailyEvents } = await fetchUiCounters({
      soClient: soClientMock,
    });
    expect(dailyEvents).toHaveLength(4);
    const intersectingEntry = dailyEvents.find(
      ({ eventName, fromTimestamp }) =>
        eventName === 'intersecting_event' && fromTimestamp === '2020-10-23T00:00:00Z'
    );

    const onlyFromUICountersEntry = dailyEvents.find(
      ({ eventName }) => eventName === 'only_reported_in_ui_counters'
    );

    const onlyFromUsageCountersEntry = dailyEvents.find(
      ({ eventName }) => eventName === 'only_reported_in_usage_counters'
    );

    const invalidCountEntry = dailyEvents.find(
      ({ eventName }) => eventName === 'my_event_malformed'
    );

    const zeroCountEntry = dailyEvents.find(
      ({ eventName }) => eventName === 'my_event_4457914848544'
    );

    const nonUiCountersEntry = dailyEvents.find(({ eventName }) => eventName === 'some_event_name');

    expect(invalidCountEntry).toBe(undefined);
    expect(nonUiCountersEntry).toBe(undefined);
    expect(zeroCountEntry).toBe(undefined);
    expect(onlyFromUICountersEntry).toBe(undefined);
    expect(onlyFromUsageCountersEntry).toMatchInlineSnapshot(`
      Object {
        "appName": "myApp",
        "counterType": "count",
        "eventName": "only_reported_in_usage_counters",
        "fromTimestamp": "2021-04-09T00:00:00Z",
        "lastUpdatedAt": "2021-04-09T08:18:03.031Z",
        "total": 1,
      }
    `);
    expect(intersectingEntry).toMatchInlineSnapshot(`
      Object {
        "appName": "Kibana_home",
        "counterType": "loaded",
        "eventName": "intersecting_event",
        "fromTimestamp": "2020-10-23T00:00:00Z",
        "lastUpdatedAt": "2020-10-23T11:27:57.067Z",
        "total": 60,
      }
    `);
  });
});
