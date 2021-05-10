/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformRawCounter } from './register_usage_counters_collector';
import { rawUsageCounters } from './__fixtures__/usage_counter_saved_objects';

describe('transformRawCounter', () => {
  it('transforms saved object raw entries', () => {
    const result = rawUsageCounters.map(transformRawCounter);
    expect(result).toMatchInlineSnapshot(`
      Array [
        undefined,
        Object {
          "counterName": "some_event_name",
          "counterType": "count",
          "domainId": "anotherDomainId",
          "fromTimestamp": "2021-04-09T00:00:00Z",
          "lastUpdatedAt": "2021-04-09T08:18:03.030Z",
          "total": 4,
        },
        Object {
          "counterName": "some_event_name",
          "counterType": "count",
          "domainId": "anotherDomainId",
          "fromTimestamp": "2021-04-11T00:00:00Z",
          "lastUpdatedAt": "2021-04-11T08:18:03.030Z",
          "total": 4,
        },
        Object {
          "counterName": "some_event_name",
          "counterType": "count",
          "domainId": "anotherDomainId2",
          "fromTimestamp": "2021-04-20T00:00:00Z",
          "lastUpdatedAt": "2021-04-20T08:18:03.030Z",
          "total": 1,
        },
        undefined,
        Object {
          "counterName": "some_event_name",
          "counterType": "custom_type",
          "domainId": "anotherDomainId2",
          "fromTimestamp": "2021-04-20T00:00:00Z",
          "lastUpdatedAt": "2021-04-20T08:18:03.030Z",
          "total": 3,
        },
        undefined,
      ]
    `);
  });
});
