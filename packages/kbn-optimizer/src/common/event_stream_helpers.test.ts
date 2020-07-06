/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as Rx from 'rxjs';
import { toArray, take } from 'rxjs/operators';

import { summarizeEventStream } from './event_stream_helpers';

it('emits each state with each event, ignoring events when summarizer returns undefined', async () => {
  const event$ = Rx.of(1, 2, 3, 4, 5);
  const initial = 0;
  const values = await summarizeEventStream(event$, initial, (state, event) => {
    if (event % 2) {
      return state + event;
    }
  })
    .pipe(toArray())
    .toPromise();

  expect(values).toMatchInlineSnapshot(`
    Array [
      Object {
        "state": 0,
      },
      Object {
        "event": 1,
        "state": 1,
      },
      Object {
        "event": 3,
        "state": 4,
      },
      Object {
        "event": 5,
        "state": 9,
      },
    ]
  `);
});

it('interleaves injected events when source is synchronous', async () => {
  const event$ = Rx.of(1, 7);
  const initial = 0;
  const values = await summarizeEventStream(event$, initial, (state, event, injectEvent) => {
    if (event < 5) {
      injectEvent(event + 2);
    }

    return state + event;
  })
    .pipe(toArray())
    .toPromise();

  expect(values).toMatchInlineSnapshot(`
    Array [
      Object {
        "state": 0,
      },
      Object {
        "event": 1,
        "state": 1,
      },
      Object {
        "event": 3,
        "state": 4,
      },
      Object {
        "event": 5,
        "state": 9,
      },
      Object {
        "event": 7,
        "state": 16,
      },
    ]
  `);
});

it('interleaves injected events when source is asynchronous', async () => {
  const event$ = Rx.of(1, 7, Rx.asyncScheduler);
  const initial = 0;
  const values = await summarizeEventStream(event$, initial, (state, event, injectEvent) => {
    if (event < 5) {
      injectEvent(event + 2);
    }

    return state + event;
  })
    .pipe(toArray())
    .toPromise();

  expect(values).toMatchInlineSnapshot(`
    Array [
      Object {
        "state": 0,
      },
      Object {
        "event": 1,
        "state": 1,
      },
      Object {
        "event": 3,
        "state": 4,
      },
      Object {
        "event": 5,
        "state": 9,
      },
      Object {
        "event": 7,
        "state": 16,
      },
    ]
  `);
});

it('interleaves mulitple injected events in order', async () => {
  const event$ = Rx.of(1);
  const initial = 0;
  const values = await summarizeEventStream(event$, initial, (state, event, injectEvent) => {
    if (event < 10) {
      injectEvent(10);
      injectEvent(20);
      injectEvent(30);
    }

    return state + event;
  })
    .pipe(toArray())
    .toPromise();

  expect(values).toMatchInlineSnapshot(`
    Array [
      Object {
        "state": 0,
      },
      Object {
        "event": 1,
        "state": 1,
      },
      Object {
        "event": 10,
        "state": 11,
      },
      Object {
        "event": 20,
        "state": 31,
      },
      Object {
        "event": 30,
        "state": 61,
      },
    ]
  `);
});

it('stops an infinite stream when unsubscribed', async () => {
  const event$ = Rx.of(1);
  const initial = 0;
  const summarize = jest.fn((prev, event, injectEvent) => {
    // always inject a follow up event, making this infinite and synchronous
    injectEvent(event + 1);
    return prev + event;
  });

  const values = await summarizeEventStream(event$, initial, summarize)
    .pipe(take(11), toArray())
    .toPromise();

  expect(values).toMatchInlineSnapshot(`
    Array [
      Object {
        "state": 0,
      },
      Object {
        "event": 1,
        "state": 1,
      },
      Object {
        "event": 2,
        "state": 3,
      },
      Object {
        "event": 3,
        "state": 6,
      },
      Object {
        "event": 4,
        "state": 10,
      },
      Object {
        "event": 5,
        "state": 15,
      },
      Object {
        "event": 6,
        "state": 21,
      },
      Object {
        "event": 7,
        "state": 28,
      },
      Object {
        "event": 8,
        "state": 36,
      },
      Object {
        "event": 9,
        "state": 45,
      },
      Object {
        "event": 10,
        "state": 55,
      },
    ]
  `);

  // ensure summarizer still only called 10 times after a timeout
  expect(summarize).toHaveBeenCalledTimes(10);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(summarize).toHaveBeenCalledTimes(10);
});
