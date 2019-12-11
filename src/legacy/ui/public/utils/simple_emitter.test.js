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

import { SimpleEmitter } from './simple_emitter';
import sinon from 'sinon';

describe('SimpleEmitter class', () => {
  let emitter;

  beforeEach(() => {
    emitter = new SimpleEmitter();
  });

  it('constructs an event emitter', () => {
    expect(emitter).toHaveProperty('on');
    expect(emitter).toHaveProperty('off');
    expect(emitter).toHaveProperty('emit');
    expect(emitter).toHaveProperty('listenerCount');
    expect(emitter).toHaveProperty('removeAllListeners');
  });

  describe('#listenerCount',  () => {
    it('counts all event listeners without any arg', () => {
      expect(emitter.listenerCount()).toBe(0);
      emitter.on('a', () => {});
      expect(emitter.listenerCount()).toBe(1);
      emitter.on('b', () => {});
      expect(emitter.listenerCount()).toBe(2);
    });

    it('limits to the event that is passed in', () => {
      expect(emitter.listenerCount()).toBe(0);
      emitter.on('a', () => {});
      expect(emitter.listenerCount('a')).toBe(1);
      emitter.on('a', () => {});
      expect(emitter.listenerCount('a')).toBe(2);
      emitter.on('b', () => {});
      expect(emitter.listenerCount('a')).toBe(2);
      expect(emitter.listenerCount('b')).toBe(1);
      expect(emitter.listenerCount()).toBe(3);
    });
  });

  describe('#on', () => {
    it('registers a handler', () => {
      const handler = sinon.stub();
      emitter.on('a', handler);
      expect(emitter.listenerCount('a')).toBe(1);

      expect(handler.callCount).toBe(0);
      emitter.emit('a');
      expect(handler.callCount).toBe(1);
    });

    it('allows multiple event handlers for the same event', () => {
      emitter.on('a', () => {});
      emitter.on('a', () => {});
      expect(emitter.listenerCount('a')).toBe(2);
    });

    it('allows the same function to be registered multiple times', () => {
      const handler = () => {};
      emitter.on('a', handler);
      expect(emitter.listenerCount()).toBe(1);
      emitter.on('a', handler);
      expect(emitter.listenerCount()).toBe(2);
    });
  });

  describe('#off', () => {
    it('removes a listener if it was registered', () => {
      const handler = sinon.stub();
      expect(emitter.listenerCount()).toBe(0);
      emitter.on('a', handler);
      expect(emitter.listenerCount('a')).toBe(1);
      emitter.off('a', handler);
      expect(emitter.listenerCount('a')).toBe(0);
    });

    it('clears all listeners if no handler is passed', () => {
      emitter.on('a', () => {});
      emitter.on('a', () => {});
      expect(emitter.listenerCount()).toBe(2);
      emitter.off('a');
      expect(emitter.listenerCount()).toBe(0);
    });

    it('does not mind if the listener is not registered', () => {
      emitter.off('a', () => {});
    });

    it('does not mind if the event has no listeners', () => {
      emitter.off('a');
    });
  });

  describe('#emit', () => {
    it('calls the handlers in the order they were defined',  () => {
      let i = 0;
      const incr =  () => ++i;
      const one = sinon.spy(incr);
      const two = sinon.spy(incr);
      const three = sinon.spy(incr);
      const four = sinon.spy(incr);

      emitter
        .on('a', one)
        .on('a', two)
        .on('a', three)
        .on('a', four)
        .emit('a');

      expect(one).toHaveProperty('callCount', 1);
      expect(one.returned(1)).toBeDefined();

      expect(two).toHaveProperty('callCount', 1);
      expect(two.returned(2)).toBeDefined();

      expect(three).toHaveProperty('callCount', 1);
      expect(three.returned(3)).toBeDefined();

      expect(four).toHaveProperty('callCount', 1);
      expect(four.returned(4)).toBeDefined();
    });

    it('always emits the handlers that were initially registered',  () => {
      const destructive = sinon.spy(() => {
        emitter.removeAllListeners();
        expect(emitter.listenerCount()).toBe(0);
      });
      const stub = sinon.stub();

      emitter.on('run', destructive).on('run', stub).emit('run');

      expect(destructive).toHaveProperty('callCount', 1);
      expect(stub).toHaveProperty('callCount', 1);
    });

    it('applies all arguments except the first', () => {
      emitter
        .on('a', (a, b, c) => {
          expect(a).toBe('foo');
          expect(b).toBe('bar');
          expect(c).toBe('baz');
        })
        .emit('a', 'foo', 'bar', 'baz');
    });

    it('uses the SimpleEmitter as the this context', () => {
      emitter
        .on('a', function () {
          expect(this).toBe(emitter);
        })
        .emit('a');
    });
  });
});
