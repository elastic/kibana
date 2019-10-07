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

import { Poller } from './poller';

const delay = (duration: number) => new Promise(r => setTimeout(r, duration));

describe('Poller', () => {
  let handler: jest.Mock<any, any>;
  let poller: Poller<string>;

  beforeEach(() => {
    handler = jest.fn().mockImplementation((iteration: number) => `polling-${iteration}`);
    poller = new Poller<string>(100, 'polling', handler);
  });

  afterEach(() => {
    poller.unsubscribe();
  });

  it('returns an observable of subject', async () => {
    await delay(300);
    expect(poller.subject$.getValue()).toBe('polling-2');
  });

  it('executes a function on an interval', async () => {
    await delay(300);
    expect(handler).toBeCalledTimes(3);
  });

  it('no longer polls after unsubscribing', async () => {
    await delay(300);
    poller.unsubscribe();
    await delay(300);
    expect(handler).toBeCalledTimes(3);
  });

  it('does not add next value if returns undefined', async () => {
    const values: any[] = [];
    const polling = new Poller<string>(100, 'polling', iteration => {
      if (iteration % 2 === 0) {
        return `polling-${iteration}`;
      }
    });

    polling.subject$.subscribe(value => {
      values.push(value);
    });
    await delay(300);
    polling.unsubscribe();

    expect(values).toEqual(['polling', 'polling-0', 'polling-2']);
  });
});
