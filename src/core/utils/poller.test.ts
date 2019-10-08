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

jest.useFakeTimers();

const cleanup: Array<Poller<any>> = [];
afterEach(() => {
  for (const poller of cleanup) {
    poller.unsubscribe();
  }
  cleanup.length = 0;
});

const setup = (fn?: (n: number) => any) => {
  const handler = jest.fn(fn || (i => `i${i}`));
  const poller = new Poller<string>(100, 'initial value', handler);
  cleanup.push(poller);

  return { handler, poller };
};

describe('Poller', () => {
  it('executes a function initially on contstruction, again every interval', () => {
    const { handler } = setup();
    expect(handler).toBeCalledTimes(1);
    jest.advanceTimersByTime(300);
    expect(handler).toBeCalledTimes(4);
  });

  it('does not add next value if returns undefined', () => {
    const { poller } = setup(i => (i % 2 === 0 ? `i${i}` : undefined));

    const next = jest.fn();
    poller.get$().subscribe(next);
    jest.advanceTimersByTime(400);

    expect(next.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "i0",
        ],
        Array [
          "i2",
        ],
        Array [
          "i4",
        ],
      ]
    `);
  });

  it('only schedules after previous completes', async () => {
    const ping = () => new Promise(resolve => setTimeout(resolve, 400));
    const { handler } = setup(ping);

    jest.advanceTimersByTime(100);
    await Promise.resolve();
    // after 100ms, if the poller wasn't waiting for first ping then it would have scheduled a second ping
    expect(handler).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(300);
    await Promise.resolve();
    // after 400ms, if the poller wasn't waiting then it would have scheduled a fourth ping
    expect(handler).toHaveBeenCalledTimes(1);

    // after 500ms, the first ping is complete and the second should be scheduled now
    jest.advanceTimersByTime(100);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  describe('getValue()', () => {
    it('returns current value', () => {
      const { poller } = setup();

      expect(poller.getValue()).toBe('i0');
      jest.advanceTimersByTime(100);
      expect(poller.getValue()).toBe('i1');
      jest.advanceTimersByTime(100);
      expect(poller.getValue()).toBe('i2');
      jest.advanceTimersByTime(50);
      expect(poller.getValue()).toBe('i2');
      jest.advanceTimersByTime(100);
      expect(poller.getValue()).toBe('i3');
    });
  });

  describe('unsubscribe()', () => {
    it('completes observables', () => {
      const { poller } = setup();

      const onComplete = jest.fn();
      poller.get$().subscribe({ complete: onComplete });
      expect(onComplete).not.toHaveBeenCalled();
      poller.unsubscribe();
      expect(onComplete).toHaveBeenCalled();
    });

    it('stops polling', () => {
      const { poller, handler } = setup();

      jest.advanceTimersByTime(0);
      expect(handler).toHaveBeenCalledTimes(1);
      poller.unsubscribe();
      jest.advanceTimersByTime(300);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
