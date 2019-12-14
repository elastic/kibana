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

import { SimpleEmitter } from '../simple_emitter';
import expect from '@kbn/expect';
import sinon from 'sinon';

describe('SimpleEmitter class', function() {
  let emitter;

  beforeEach(function() {
    emitter = new SimpleEmitter();
  });

  it('constructs an event emitter', function() {
    expect(emitter).to.have.property('on');
    expect(emitter).to.have.property('off');
    expect(emitter).to.have.property('emit');
    expect(emitter).to.have.property('listenerCount');
    expect(emitter).to.have.property('removeAllListeners');
  });

  describe('#listenerCount', function() {
    it('counts all event listeners without any arg', function() {
      expect(emitter.listenerCount()).to.be(0);
      emitter.on('a', function() {});
      expect(emitter.listenerCount()).to.be(1);
      emitter.on('b', function() {});
      expect(emitter.listenerCount()).to.be(2);
    });

    it('limits to the event that is passed in', function() {
      expect(emitter.listenerCount()).to.be(0);
      emitter.on('a', function() {});
      expect(emitter.listenerCount('a')).to.be(1);
      emitter.on('a', function() {});
      expect(emitter.listenerCount('a')).to.be(2);
      emitter.on('b', function() {});
      expect(emitter.listenerCount('a')).to.be(2);
      expect(emitter.listenerCount('b')).to.be(1);
      expect(emitter.listenerCount()).to.be(3);
    });
  });

  describe('#on', function() {
    it('registers a handler', function() {
      const handler = sinon.stub();
      emitter.on('a', handler);
      expect(emitter.listenerCount('a')).to.be(1);

      expect(handler.callCount).to.be(0);
      emitter.emit('a');
      expect(handler.callCount).to.be(1);
    });

    it('allows multiple event handlers for the same event', function() {
      emitter.on('a', function() {});
      emitter.on('a', function() {});
      expect(emitter.listenerCount('a')).to.be(2);
    });

    it('allows the same function to be registered multiple times', function() {
      const handler = function() {};
      emitter.on('a', handler);
      expect(emitter.listenerCount()).to.be(1);
      emitter.on('a', handler);
      expect(emitter.listenerCount()).to.be(2);
    });
  });

  describe('#off', function() {
    it('removes a listener if it was registered', function() {
      const handler = sinon.stub();
      expect(emitter.listenerCount()).to.be(0);
      emitter.on('a', handler);
      expect(emitter.listenerCount('a')).to.be(1);
      emitter.off('a', handler);
      expect(emitter.listenerCount('a')).to.be(0);
    });

    it('clears all listeners if no handler is passed', function() {
      emitter.on('a', function() {});
      emitter.on('a', function() {});
      expect(emitter.listenerCount()).to.be(2);
      emitter.off('a');
      expect(emitter.listenerCount()).to.be(0);
    });

    it('does not mind if the listener is not registered', function() {
      emitter.off('a', function() {});
    });

    it('does not mind if the event has no listeners', function() {
      emitter.off('a');
    });
  });

  describe('#emit', function() {
    it('calls the handlers in the order they were defined', function() {
      let i = 0;
      const incr = function() {
        return ++i;
      };
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

      expect(one).to.have.property('callCount', 1);
      expect(one.returned(1)).to.be.ok();

      expect(two).to.have.property('callCount', 1);
      expect(two.returned(2)).to.be.ok();

      expect(three).to.have.property('callCount', 1);
      expect(three.returned(3)).to.be.ok();

      expect(four).to.have.property('callCount', 1);
      expect(four.returned(4)).to.be.ok();
    });

    it('always emits the handlers that were initially registered', function() {
      const destructive = sinon.spy(function() {
        emitter.removeAllListeners();
        expect(emitter.listenerCount()).to.be(0);
      });
      const stub = sinon.stub();

      emitter
        .on('run', destructive)
        .on('run', stub)
        .emit('run');

      expect(destructive).to.have.property('callCount', 1);
      expect(stub).to.have.property('callCount', 1);
    });

    it('applies all arguments except the first', function() {
      emitter
        .on('a', function(a, b, c) {
          expect(a).to.be('foo');
          expect(b).to.be('bar');
          expect(c).to.be('baz');
        })
        .emit('a', 'foo', 'bar', 'baz');
    });

    it('uses the SimpleEmitter as the this context', function() {
      emitter
        .on('a', function() {
          expect(this).to.be(emitter);
        })
        .emit('a');
    });
  });
});
