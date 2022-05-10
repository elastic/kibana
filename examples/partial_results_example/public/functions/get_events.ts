/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, fromEvent, merge } from 'rxjs';
import { distinct, map, pluck, scan, take } from 'rxjs/operators';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin';

const EVENTS: Array<keyof WindowEventMap> = [
  'mousedown',
  'mouseup',
  'click',
  'keydown',
  'keyup',
  'keypress',
];

export const getEvents: ExpressionFunctionDefinition<
  'getEvents',
  null,
  {},
  Observable<Datatable>
> = {
  name: 'getEvents',
  type: 'datatable',
  help: 'Listens for the window events and returns a table with the triggered ones.',
  args: {},
  fn() {
    return merge(...EVENTS.map((event) => fromEvent(window, event))).pipe(
      pluck('type'),
      distinct(),
      take(EVENTS.length),
      scan((events, event) => [...events, event], [] as string[]),
      map((events) => ({
        type: 'datatable',
        columns: [
          {
            id: 'event',
            meta: { type: 'string' },
            name: 'Event',
          },
        ],
        rows: Array.from(events).map((event) => ({ event })),
      }))
    );
  },
};
