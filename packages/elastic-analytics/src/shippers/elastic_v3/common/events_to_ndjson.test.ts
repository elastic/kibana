/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Event } from '../../../events';
import { eventsToNDJSON } from './events_to_ndjson';

describe('eventsToNDJSON', () => {
  test('works with one event', () => {
    const event: Event = {
      timestamp: '2020-01-01T00:00:00.000Z',
      event_type: 'event_type',
      context: {},
      properties: {},
    };

    expect(eventsToNDJSON([event])).toEqual(
      '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"event_type","context":{},"properties":{}}\n'
    );
  });

  test('works with many events', () => {
    const events: Event[] = [
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        event_type: 'event_type',
        context: {},
        properties: {},
      },
      {
        timestamp: '2020-01-02T00:00:00.000Z',
        event_type: 'event_type',
        context: {},
        properties: {},
      },
    ];

    expect(eventsToNDJSON(events)).toEqual(
      '{"timestamp":"2020-01-01T00:00:00.000Z","event_type":"event_type","context":{},"properties":{}}\n{"timestamp":"2020-01-02T00:00:00.000Z","event_type":"event_type","context":{},"properties":{}}\n'
    );
  });
});
