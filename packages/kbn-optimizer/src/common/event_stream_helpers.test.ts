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
import { toArray } from 'rxjs/operators';

import { summarizeEvent$ } from './event_stream_helpers';

it('emits each state with each event, ignoring events when reducer returns undefined', async () => {
  const values = await summarizeEvent$(
    Rx.of(1, 2, 3, 4, 5),
    {
      sum: 0,
    },
    (state, event) => {
      if (event % 2) {
        return {
          sum: state.sum + event,
        };
      }
    }
  )
    .pipe(toArray())
    .toPromise();

  expect(values).toMatchInlineSnapshot(`
    Array [
      Object {
        "state": Object {
          "sum": 0,
        },
      },
      Object {
        "event": 1,
        "state": Object {
          "sum": 1,
        },
      },
      Object {
        "event": 3,
        "state": Object {
          "sum": 4,
        },
      },
      Object {
        "event": 5,
        "state": Object {
          "sum": 9,
        },
      },
    ]
  `);
});
