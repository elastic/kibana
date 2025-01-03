/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CounterEvent } from '../common/counters';
import { toDailyEvents } from './register_usage_counters_collector';

describe('toDailyEvents', () => {
  it('adapts counter events to have the expected UI properties', () => {
    const counters: CounterEvent[] = [
      {
        domainId: 'foo',
        counterType: 'bar',
        counterName: 'count',
        lastUpdatedAt: '2024-06-19T12:03:25.795Z',
        fromTimestamp: '2024-06-19T00:00:00Z',
        total: 18,
      },
      {
        domainId: 'foo',
        counterType: 'baz',
        counterName: 'count',
        lastUpdatedAt: '2024-06-19T14:13:25.795Z',
        fromTimestamp: '2024-06-19T00:00:00Z',
        total: 4,
      },
    ];

    expect(toDailyEvents(counters)).toEqual({
      dailyEvents: [
        {
          domainId: 'foo',
          counterType: 'bar',
          counterName: 'count',
          lastUpdatedAt: '2024-06-19T12:03:25.795Z',
          fromTimestamp: '2024-06-19T00:00:00Z',
          total: 18,
        },
        {
          domainId: 'foo',
          counterType: 'baz',
          counterName: 'count',
          lastUpdatedAt: '2024-06-19T14:13:25.795Z',
          fromTimestamp: '2024-06-19T00:00:00Z',
          total: 4,
        },
      ],
    });
  });
});
