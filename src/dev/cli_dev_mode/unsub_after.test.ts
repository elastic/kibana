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
import { firstValueFrom } from '@kbn/std';

import { unsubAfter } from './unsub_after';

it('emits the items from source and the item that passes the test, then completes', async () => {
  const notifs = await firstValueFrom(
    Rx.interval(1).pipe(
      unsubAfter((i) => i > 3),
      toArray()
    )
  );

  expect(notifs).toMatchInlineSnapshot(`
    Array [
      0,
      1,
      2,
      3,
      4,
    ]
  `);
});
