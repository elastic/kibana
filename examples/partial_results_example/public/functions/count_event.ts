/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, fromEvent } from 'rxjs';
import { scan, startWith } from 'rxjs/operators';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin';

export interface CountEventArguments {
  event: string;
}

export const countEvent: ExpressionFunctionDefinition<
  'countEvent',
  null,
  CountEventArguments,
  Observable<number>
> = {
  name: 'countEvent',
  type: 'number',
  help: 'Subscribes for an event and counts a number of triggers.',
  args: {
    event: {
      aliases: ['_'],
      types: ['string'],
      help: 'The event name.',
      required: true,
    },
  },
  fn(input, { event }) {
    return fromEvent(window, event).pipe(
      scan((count) => count + 1, 1),
      startWith(1)
    );
  },
};
