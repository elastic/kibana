/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CounterEvent } from '../common/counters';
import { toDailyEvents } from './register_ui_counters_collector';

describe('toDailyEvents', () => {
  it('adapts counter events to have the expected UI properties', () => {
    const counters: CounterEvent[] = [
      {
        domainId: 'dashboards',
        counterType: 'loaded',
        counterName: 'lens',
        total: 18,
      },
      {
        domainId: 'dashboards',
        counterType: 'updated',
        counterName: 'lens',
        total: 4,
      },
    ];

    expect(toDailyEvents(counters)).toEqual({
      dailyEvents: [
        {
          appName: 'dashboards',
          counterType: 'loaded',
          eventName: 'lens',
          total: 18,
        },
        {
          appName: 'dashboards',
          counterType: 'updated',
          eventName: 'lens',
          total: 4,
        },
      ],
    });
  });
});
