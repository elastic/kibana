/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  transformRawUiCounterObject,
  transformRawUsageCounterObject,
  fetchUiCounters,
} from './register_ui_counters_collector';
import { rawUiCounters } from './__fixtures__/ui_counter_saved_objects';
import { rawUsageCounters } from './__fixtures__/usage_counter_saved_objects';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { UI_COUNTER_SAVED_OBJECT_TYPE } from './ui_counter_saved_object_type';
import { USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '../../../../usage_collection/server';

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
          "eventName": "home_tutorial_directory",
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
      ]
    `);
  });
});

describe('transformRawUiCounterObject', () => {
  it('transforms ui counters savedObject raw entries', () => {
    const result = rawUiCounters.map(transformRawUiCounterObject);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "appName": "Kibana_home",
          "counterType": "click",
          "eventName": "ingest_data_card_home_tutorial_directory",
          "fromTimestamp": "2020-11-24T00:00:00Z",
          "lastUpdatedAt": "2020-11-24T11:27:57.067Z",
          "total": 3,
        },
        Object {
          "appName": "Kibana_home",
          "counterType": "click",
          "eventName": "home_tutorial_directory",
          "fromTimestamp": "2020-11-24T00:00:00Z",
          "lastUpdatedAt": "2020-11-24T11:27:57.067Z",
          "total": 1,
        },
        Object {
          "appName": "Kibana_home",
          "counterType": "loaded",
          "eventName": "home_tutorial_directory",
          "fromTimestamp": "2020-10-23T00:00:00Z",
          "lastUpdatedAt": "2020-10-23T11:27:57.067Z",
          "total": 3,
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
  it('merges saved objects from both ui_counters and usage_counters saved objects', async () => {
    soClientMock.find.mockImplementation(async ({ type }) => {
      switch (type) {
        case UI_COUNTER_SAVED_OBJECT_TYPE:
          return { saved_objects: rawUiCounters };
        case USAGE_COUNTERS_SAVED_OBJECT_TYPE:
          return { saved_objects: rawUsageCounters };
        default:
          throw new Error(`unexpected type ${type}`);
      }
    });

    const { dailyEvents } = await fetchUiCounters({ soClient: soClientMock });
    expect(dailyEvents).toHaveLength(6);
    const intersectingEntry = dailyEvents.find(
      (dailyEvent) =>
        dailyEvent.eventName === 'home_tutorial_directory' &&
        dailyEvent.fromTimestamp === '2020-10-23T00:00:00Z'
    );
    const invalidCountEntry = dailyEvents.find(
      (dailyEvent) => dailyEvent.eventName === 'my_event_malformed'
    );

    const zeroCountEntry = dailyEvents.find(
      (dailyEvent) => dailyEvent.eventName === 'my_event_4457914848544'
    );

    const nonUiCountersEntry = dailyEvents.find(
      (dailyEvent) => dailyEvent.eventName === 'some_event_name'
    );

    expect(invalidCountEntry).toBe(undefined);
    expect(nonUiCountersEntry).toBe(undefined);
    expect(zeroCountEntry).toBe(undefined);
    expect(intersectingEntry).toMatchInlineSnapshot(`
      Object {
        "appName": "Kibana_home",
        "counterType": "loaded",
        "eventName": "home_tutorial_directory",
        "fromTimestamp": "2020-10-23T00:00:00Z",
        "lastUpdatedAt": "2020-10-23T11:27:57.067Z",
        "total": 60,
      }
    `);
  });
});
