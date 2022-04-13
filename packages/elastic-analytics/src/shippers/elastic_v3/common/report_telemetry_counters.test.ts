/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Subject, take, toArray } from 'rxjs';
import type { Event, TelemetryCounter } from '../../../events';
import { TelemetryCounterType } from '../../../events';
import { createTelemetryCounterHelper } from './report_telemetry_counters';

describe('reportTelemetryCounters', () => {
  let reportTelemetryCounters: ReturnType<typeof createTelemetryCounterHelper>;
  let telemetryCounter$: Subject<TelemetryCounter>;

  beforeEach(() => {
    telemetryCounter$ = new Subject<TelemetryCounter>();
    reportTelemetryCounters = createTelemetryCounterHelper(telemetryCounter$, 'my_shipper');
  });

  test('emits a success counter for one event', async () => {
    const events: Event[] = [
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_a',
        context: {},
        properties: {},
      },
    ];

    const counters = firstValueFrom(telemetryCounter$);

    reportTelemetryCounters(events);

    await expect(counters).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "OK",
        "count": 1,
        "event_type": "event_type_a",
        "source": "my_shipper",
        "type": "succeeded",
      }
    `);
  });

  test('emits a success counter for one event with custom code', async () => {
    const events: Event[] = [
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_a',
        context: {},
        properties: {},
      },
    ];

    const counters = firstValueFrom(telemetryCounter$);

    reportTelemetryCounters(events, { code: 'my_code' });

    await expect(counters).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "my_code",
        "count": 1,
        "event_type": "event_type_a",
        "source": "my_shipper",
        "type": "succeeded",
      }
    `);
  });

  test('emits a counter with custom type', async () => {
    const events: Event[] = [
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_a',
        context: {},
        properties: {},
      },
    ];

    const counters = firstValueFrom(telemetryCounter$);

    reportTelemetryCounters(events, {
      type: TelemetryCounterType.dropped,
      code: 'my_code',
    });

    await expect(counters).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "my_code",
        "count": 1,
        "event_type": "event_type_a",
        "source": "my_shipper",
        "type": "dropped",
      }
    `);
  });

  test('emits a failure counter for one event with error message as a code', async () => {
    const events: Event[] = [
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_a',
        context: {},
        properties: {},
      },
    ];

    const counters = firstValueFrom(telemetryCounter$);

    reportTelemetryCounters(events, {
      error: new Error('Something went terribly wrong'),
    });

    await expect(counters).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "Something went terribly wrong",
        "count": 1,
        "event_type": "event_type_a",
        "source": "my_shipper",
        "type": "failed",
      }
    `);
  });

  test('emits a failure counter for one event with custom code', async () => {
    const events: Event[] = [
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_a',
        context: {},
        properties: {},
      },
    ];

    const counters = firstValueFrom(telemetryCounter$);

    reportTelemetryCounters(events, {
      code: 'my_code',
      error: new Error('Something went terribly wrong'),
    });

    await expect(counters).resolves.toMatchInlineSnapshot(`
      Object {
        "code": "my_code",
        "count": 1,
        "event_type": "event_type_a",
        "source": "my_shipper",
        "type": "failed",
      }
    `);
  });

  test('emits a success counter for multiple events of different types', async () => {
    const events: Event[] = [
      // 2 types a
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_a',
        context: {},
        properties: {},
      },
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_a',
        context: {},
        properties: {},
      },
      // 1 type b
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type_b',
        context: {},
        properties: {},
      },
    ];

    const counters = firstValueFrom(telemetryCounter$.pipe(take(2), toArray()));

    reportTelemetryCounters(events);

    await expect(counters).resolves.toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "OK",
          "count": 2,
          "event_type": "event_type_a",
          "source": "my_shipper",
          "type": "succeeded",
        },
        Object {
          "code": "OK",
          "count": 1,
          "event_type": "event_type_b",
          "source": "my_shipper",
          "type": "succeeded",
        },
      ]
    `);
  });
});
