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

import _ from 'lodash';
import sinon from 'sinon';
import noDigestPromises from 'test_utils/no_digest_promises';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { PersistedStateError } from '../../errors';
import '..';

let PersistedState;

describe('Persisted State Provider', function () {
  noDigestPromises.activateForSuite();

  beforeEach(function () {
    ngMock.module('kibana');

    ngMock.inject(function ($injector) {
      PersistedState = $injector.get('PersistedState');
    });
  });

  describe('state creation', function () {
    let persistedState;

    it('should create an empty state instance', function () {
      persistedState = new PersistedState();
      expect(persistedState.get()).to.eql({});
    });

    it('should create a state instance with data', function () {
      const val = { red: 'blue' };
      persistedState = new PersistedState(val);

      expect(persistedState.get()).to.eql(val);
      // ensure we get a copy of the state, not the actual state object
      expect(persistedState.get()).to.not.equal(val);
    });

    it('should create a copy of the state passed in', function () {
      const val = { red: 'blue' };
      persistedState = new PersistedState(val);

      expect(persistedState.get()).to.eql(val);
      expect(persistedState.get()).to.not.equal(val);
    });

    it('should throw if given an invalid value', function () {
      const run = function () {
        const val = 'bananas';
        new PersistedState(val);
      };

      expect(run).to.throwException(function (err) {
        expect(err).to.be.a(PersistedStateError);
      });
    });
  });

  describe('mutation', function () {
    it('should not mutate the internal object', function () {
      const persistedStateValue = { hello: 'world' };
      const insertedObj = { farewell: 'cruel world' };
      const persistedState = new PersistedState(persistedStateValue);

      const obj = persistedState.get();
      _.assign(obj, insertedObj);

      expect(obj).to.have.property('farewell');
      expect(persistedState.get()).to.not.have.property('farewell');
    });
  });

  describe('JSON importing and exporting', function () {
    let persistedStateValue;

    beforeEach(function () {
      persistedStateValue = { one: 1, two: 2, 'meaning of life': 42 };
    });

    describe('exporting state to JSON', function () {
      it('should return the full JSON representation', function () {
        const persistedState = new PersistedState(persistedStateValue);

        const json = persistedState.toJSON();
        expect(json).to.eql(persistedStateValue);
      });
    });

    describe('importing state from JSON string (hydration)', function () {
      it('should set the state from JSON string input', function () {
        const stateJSON = JSON.stringify(persistedStateValue);
        const persistedState = new PersistedState();
        expect(persistedState.get()).to.eql({});

        persistedState.fromString(stateJSON);
        expect(persistedState.get()).to.eql(persistedStateValue);
      });
    });
  });

  describe('get state', function () {
    it('should perform deep gets with various formats', function () {
      const obj = {
        red: {
          green: {
            blue: 'yellow'
          }
        },
        orange: [1, 2, false, 4],
        purple: {
          violet: ''
        }
      };
      const persistedState = new PersistedState(obj);
      expect(persistedState.get()).to.eql(obj);

      expect(persistedState.get('red')).to.eql({ green: { blue: 'yellow' } });
      expect(persistedState.get('red.green')).to.eql({ blue: 'yellow' });
      expect(persistedState.get('red[green]')).to.eql({ blue: 'yellow' });
      expect(persistedState.get(['red', 'green'])).to.eql({ blue: 'yellow' });
      expect(persistedState.get('red.green.blue')).to.eql('yellow');
      expect(persistedState.get('red[green].blue')).to.eql('yellow');
      expect(persistedState.get('red.green[blue]')).to.eql('yellow');
      expect(persistedState.get('red[green][blue]')).to.eql('yellow');
      expect(persistedState.get('red.green.blue')).to.eql('yellow');
      expect(persistedState.get('orange')).to.eql([1, 2, false, 4]);
      expect(persistedState.get('orange[0]')).to.equal(1);
      expect(persistedState.get('orange[2]')).to.equal(false);
      expect(persistedState.get('purple')).to.eql({ violet: '' });
    });

    it('should perform deep gets with arrays', function () {
      const persistedState = new PersistedState({ hello: { nouns: ['world', 'humans', 'everyone'] } });

      expect(persistedState.get()).to.eql({ hello: { nouns: ['world', 'humans', 'everyone'] } });
      expect(persistedState.get('hello')).to.eql({ nouns: ['world', 'humans', 'everyone'] });
      expect(persistedState.get('hello.nouns')).to.eql(['world', 'humans', 'everyone']);
    });
  });

  describe('set state', function () {
    describe('path format support', function () {
      it('should create deep objects from dot notation', function () {
        const persistedState = new PersistedState();
        persistedState.set('one.two.three', 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects from array notation', function () {
        const persistedState = new PersistedState();
        persistedState.set('one[two][three]', 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects from arrays', function () {
        const persistedState = new PersistedState();
        persistedState.set(['one', 'two', 'three'], 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects with an existing path', function () {
        const persistedState = new PersistedState({}, 'deep.path');
        persistedState.set('green[red].blue', 4);
        expect(persistedState.get()).to.eql({ green: { red: { blue: 4 } } });
      });
    });

    describe('simple replace operations', function () {
      let persistedState;

      it('should replace value with string', function () {
        persistedState = new PersistedState({ hello: 'world' });
        expect(persistedState.get()).to.eql({ hello: 'world' });

        persistedState.set('hello', 'fare thee well');
        expect(persistedState.get()).to.eql({ hello: 'fare thee well' });
      });

      it('should replace value with array', function () {
        persistedState = new PersistedState({ hello: ['world', 'everyone'] });
        expect(persistedState.get()).to.eql({ hello: ['world', 'everyone'] });

        persistedState.set('hello', ['people']);
        expect(persistedState.get()).to.eql({ hello: ['people'] });
      });

      it('should replace value with object', function () {
        persistedState = new PersistedState({ hello: 'world' });
        expect(persistedState.get()).to.eql({ hello: 'world' });

        persistedState.set('hello', { message: 'fare thee well' });
        expect(persistedState.get()).to.eql({ hello: { message: 'fare thee well' } });
      });

      it('should replace value with object, removing old properties', function () {
        persistedState = new PersistedState({ hello: { message: 'world' } });
        expect(persistedState.get()).to.eql({ hello: { message: 'world' } });

        persistedState.set('hello', { length: 5 });
        expect(persistedState.get()).to.eql({ hello: { length: 5 } });
      });
    });

    describe('deep replace operations', function () {
      let persistedState;

      it('should append to the object', function () {
        persistedState = new PersistedState({ hello: { message: 'world' } });
        expect(persistedState.get()).to.eql({ hello: { message: 'world' } });

        persistedState.set('hello.length', 5);
        expect(persistedState.get()).to.eql({ hello: { message: 'world', length: 5 } });
      });

      it('should change the value in the array', function () {
        persistedState = new PersistedState({ hello: { nouns: ['world', 'humans', 'everyone'] } });
        persistedState.set('hello.nouns[1]', 'aliens');

        expect(persistedState.get()).to.eql({ hello: { nouns: ['world', 'aliens', 'everyone'] } });
        expect(persistedState.get('hello')).to.eql({ nouns: ['world', 'aliens', 'everyone'] });
        expect(persistedState.get('hello.nouns')).to.eql(['world', 'aliens', 'everyone']);
      });
    });
  });

  describe('internal state tracking', function () {
    it('should be an empty object', function () {
      const persistedState = new PersistedState();
      expect(persistedState._defaultState).to.eql({});
    });

    it('should store the default state value', function () {
      const val = { one: 1, two: 2 };
      const persistedState = new PersistedState(val);
      expect(persistedState._defaultState).to.eql(val);
    });

    it('should keep track of changes', function () {
      const val = { one: 1, two: 2 };
      const persistedState = new PersistedState(val);

      persistedState.set('two', 22);
      expect(persistedState._defaultState).to.eql(val);
      expect(persistedState._changedState).to.eql({ two: 22 });
    });
  });

  describe('events', function () {
    let persistedState;
    let emitter;

    const getByType = function (type, spy) {
      spy = spy || emitter;
      return spy.getCalls().filter(function (call) {
        return call.args[0] === type;
      });
    };

    const watchEmitter = function (state) {
      return sinon.spy(state, 'emit');
    };

    beforeEach(function () {
      persistedState = new PersistedState({ checker: { events: 'event tests' } });
      emitter = watchEmitter(persistedState);
    });

    it('should emit set when setting values', function () {
      expect(getByType('set')).to.have.length(0);
      persistedState.set('checker.time', 'now');
      expect(getByType('set')).to.have.length(1);
    });

    it('should not emit when setting value silently', function () {
      expect(getByType('set')).to.have.length(0);
      persistedState.setSilent('checker.time', 'now');
      expect(getByType('set')).to.have.length(0);
    });

    it('should emit change when changing values', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.set('checker.time', 'now');
      expect(getByType('change')).to.have.length(1);
    });

    it('should not emit when changing values silently', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.setSilent('checker.time', 'now');
      expect(getByType('change')).to.have.length(0);
    });

    it('should not emit change when values are identical', function () {
      expect(getByType('change')).to.have.length(0);
      // check both forms of setting the same value
      persistedState.set('checker', { events: 'event tests' });
      expect(getByType('change')).to.have.length(0);
      persistedState.set('checker.events', 'event tests');
      expect(getByType('change')).to.have.length(0);
    });

    it('should emit change when values change', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.set('checker.events', 'i changed');
      expect(getByType('change')).to.have.length(1);
    });
  });
});
