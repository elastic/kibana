/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PersistedState } from './persisted_state';

describe('Persisted State Provider', () => {
  describe('state creation', () => {
    let persistedState: PersistedState;

    test('should create an empty state instance', () => {
      persistedState = new PersistedState();
      expect(persistedState.get()).toEqual({});
    });

    test('should create a state instance with data', () => {
      const val = { red: 'blue' };
      persistedState = new PersistedState(val);

      expect(persistedState.get()).toEqual(val);
      // ensure we get a copy of the state, not the actual state object
      expect(persistedState.get()).not.toBe(val);
    });

    test('should create a copy of the state passed in', () => {
      const val = { red: 'blue' };
      persistedState = new PersistedState(val);

      expect(persistedState.get()).toEqual(val);
      expect(persistedState.get()).not.toBe(val);
    });

    test('should throw if given an invalid value', () => {
      expect(() => new PersistedState('bananas')).toThrow(Error);
    });
  });

  describe('mutation', () => {
    test('should not mutate the internal object', () => {
      const persistedStateValue = { hello: 'world' };
      const insertedObj = { farewell: 'cruel world' };
      const persistedState = new PersistedState(persistedStateValue);

      expect({
        ...persistedState.get(),
        ...insertedObj,
      }).toHaveProperty('farewell');

      expect(persistedState.get()).not.toHaveProperty('farewell');
    });
  });

  describe('JSON importing and exporting', () => {
    let persistedStateValue: any;

    beforeEach(() => {
      persistedStateValue = { one: 1, two: 2, 'meaning of life': 42 };
    });

    describe('exporting state to JSON', () => {
      test('should return the full JSON representation', () => {
        const persistedState = new PersistedState(persistedStateValue);

        const json = persistedState.toJSON();
        expect(json).toEqual(persistedStateValue);
      });
    });

    describe('importing state from JSON string (hydration)', () => {
      test('should set the state from JSON string input', () => {
        const stateJSON = JSON.stringify(persistedStateValue);
        const persistedState = new PersistedState();
        expect(persistedState.get()).toEqual({});

        persistedState.fromString(stateJSON);
        expect(persistedState.get()).toEqual(persistedStateValue);
      });
    });
  });

  describe('get state', () => {
    test('should perform deep gets with various formats', () => {
      const obj = {
        red: {
          green: {
            blue: 'yellow',
          },
        },
        orange: [1, 2, false, 4],
        purple: {
          violet: '',
        },
      };
      const persistedState = new PersistedState(obj);
      expect(persistedState.get()).toEqual(obj);

      expect(persistedState.get('red')).toEqual({ green: { blue: 'yellow' } });
      expect(persistedState.get('red.green')).toEqual({ blue: 'yellow' });
      expect(persistedState.get('red[green]')).toEqual({ blue: 'yellow' });
      expect(persistedState.get(['red', 'green'])).toEqual({ blue: 'yellow' });
      expect(persistedState.get('red.green.blue')).toEqual('yellow');
      expect(persistedState.get('red[green].blue')).toEqual('yellow');
      expect(persistedState.get('red.green[blue]')).toEqual('yellow');
      expect(persistedState.get('red[green][blue]')).toEqual('yellow');
      expect(persistedState.get('red.green.blue')).toEqual('yellow');
      expect(persistedState.get('orange')).toEqual([1, 2, false, 4]);
      expect(persistedState.get('orange[0]')).toEqual(1);
      expect(persistedState.get('orange[2]')).toEqual(false);
      expect(persistedState.get('purple')).toEqual({ violet: '' });
    });

    test('should perform deep gets with arrays', () => {
      const persistedState = new PersistedState({
        hello: { nouns: ['world', 'humans', 'everyone'] },
      });

      expect(persistedState.get()).toEqual({ hello: { nouns: ['world', 'humans', 'everyone'] } });
      expect(persistedState.get('hello')).toEqual({ nouns: ['world', 'humans', 'everyone'] });
      expect(persistedState.get('hello.nouns')).toEqual(['world', 'humans', 'everyone']);
    });
  });

  describe('set state', () => {
    describe('path format support', () => {
      test('should create deep objects from dot notation', () => {
        const persistedState = new PersistedState();
        persistedState.set('one.two.three', 4);
        expect(persistedState.get()).toEqual({ one: { two: { three: 4 } } });
      });

      test('should create deep objects from array notation', () => {
        const persistedState = new PersistedState();
        persistedState.set('one[two][three]', 4);
        expect(persistedState.get()).toEqual({ one: { two: { three: 4 } } });
      });

      test('should create deep objects from arrays', () => {
        const persistedState = new PersistedState();
        persistedState.set(['one', 'two', 'three'], 4);
        expect(persistedState.get()).toEqual({ one: { two: { three: 4 } } });
      });

      test('should create deep objects with an existing path', () => {
        const persistedState = new PersistedState({}, 'deep.path');
        persistedState.set('green[red].blue', 4);
        expect(persistedState.get()).toEqual({ green: { red: { blue: 4 } } });
      });
    });

    describe('simple replace operations', () => {
      let persistedState;

      test('should replace value with string', () => {
        persistedState = new PersistedState({ hello: 'world' });
        expect(persistedState.get()).toEqual({ hello: 'world' });

        persistedState.set('hello', 'fare thee well');
        expect(persistedState.get()).toEqual({ hello: 'fare thee well' });
      });

      test('should replace value with array', () => {
        persistedState = new PersistedState({ hello: ['world', 'everyone'] });
        expect(persistedState.get()).toEqual({ hello: ['world', 'everyone'] });

        persistedState.set('hello', ['people']);
        expect(persistedState.get()).toEqual({ hello: ['people'] });
      });

      test('should replace value with object', () => {
        persistedState = new PersistedState({ hello: 'world' });
        expect(persistedState.get()).toEqual({ hello: 'world' });

        persistedState.set('hello', { message: 'fare thee well' });
        expect(persistedState.get()).toEqual({ hello: { message: 'fare thee well' } });
      });

      test('should replace value with object, removing old properties', () => {
        persistedState = new PersistedState({ hello: { message: 'world' } });
        expect(persistedState.get()).toEqual({ hello: { message: 'world' } });

        persistedState.set('hello', { length: 5 });
        expect(persistedState.get()).toEqual({ hello: { length: 5 } });
      });
    });

    describe('deep replace operations', () => {
      let persistedState;

      test('should append to the object', () => {
        persistedState = new PersistedState({ hello: { message: 'world' } });
        expect(persistedState.get()).toEqual({ hello: { message: 'world' } });

        persistedState.set('hello.length', 5);
        expect(persistedState.get()).toEqual({ hello: { message: 'world', length: 5 } });
      });

      test('should change the value in the array', () => {
        persistedState = new PersistedState({ hello: { nouns: ['world', 'humans', 'everyone'] } });
        persistedState.set('hello.nouns[1]', 'aliens');

        expect(persistedState.get()).toEqual({ hello: { nouns: ['world', 'aliens', 'everyone'] } });
        expect(persistedState.get('hello')).toEqual({ nouns: ['world', 'aliens', 'everyone'] });
        expect(persistedState.get('hello.nouns')).toEqual(['world', 'aliens', 'everyone']);
      });
    });
  });

  describe('internal state tracking', () => {
    test('should be an empty object', () => {
      const persistedState = new PersistedState();
      expect(persistedState).toHaveProperty('_defaultState', {});
    });

    test('should store the default state value', () => {
      const val = { one: 1, two: 2 };
      const persistedState = new PersistedState(val);
      expect(persistedState).toHaveProperty('_defaultState', val);
    });

    test('should keep track of changes', () => {
      const val = { one: 1, two: 2 };
      const persistedState = new PersistedState(val);

      persistedState.set('two', 22);
      expect(persistedState).toHaveProperty('_defaultState', val);
      expect(persistedState).toHaveProperty('_changedState', { two: 22 });
    });
  });

  describe('events', () => {
    let persistedState: PersistedState;
    let emitSpy: jest.SpyInstance;

    const getByType = (type: string): any[] => {
      return emitSpy.mock.calls.filter(([callType]) => callType === type);
    };

    const watchEmitter = (state: any) => {
      return jest.spyOn(state, 'emit');
    };

    beforeEach(() => {
      persistedState = new PersistedState({ checker: { events: 'event tests' } });
      emitSpy = watchEmitter(persistedState);
    });

    afterEach(() => {
      emitSpy.mockRestore();
    });

    test('should emit set when setting values', () => {
      expect(getByType('set')).toHaveLength(0);
      persistedState.set('checker.time', 'now');
      expect(getByType('set')).toHaveLength(1);
    });

    test('should not emit when setting value silently', () => {
      expect(getByType('set')).toHaveLength(0);
      persistedState.setSilent('checker.time', 'now');
      expect(getByType('set')).toHaveLength(0);
    });

    test('should emit change when changing values', () => {
      expect(getByType('change')).toHaveLength(0);
      persistedState.set('checker.time', 'now');
      expect(getByType('change')).toHaveLength(1);
    });

    test('should not emit when changing values silently', () => {
      expect(getByType('change')).toHaveLength(0);
      persistedState.setSilent('checker.time', 'now');
      expect(getByType('change')).toHaveLength(0);
    });

    test('should not emit change when values are identical', () => {
      expect(getByType('change')).toHaveLength(0);
      // check both forms of setting the same value
      persistedState.set('checker', { events: 'event tests' });
      expect(getByType('change')).toHaveLength(0);
      persistedState.set('checker.events', 'event tests');
      expect(getByType('change')).toHaveLength(0);
    });

    test('should emit change when values change', () => {
      expect(getByType('change')).toHaveLength(0);
      persistedState.set('checker.events', 'i changed');
      expect(getByType('change')).toHaveLength(1);
    });
  });
});
