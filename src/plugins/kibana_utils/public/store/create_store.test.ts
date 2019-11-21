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

import { createStore } from './create_store';

test('can create store', () => {
  const store = createStore({});
  expect(store).toMatchObject({
    get: expect.any(Function),
    set: expect.any(Function),
    state$: expect.any(Object),
    createMutators: expect.any(Function),
    mutators: expect.any(Object),
    redux: {
      getState: expect.any(Function),
      dispatch: expect.any(Function),
      subscribe: expect.any(Function),
    },
  });
});

test('can set default state', () => {
  const defaultState = {
    foo: 'bar',
  };
  const store = createStore(defaultState);
  expect(store.get()).toEqual(defaultState);
  expect(store.redux.getState()).toEqual(defaultState);
});

test('can set state', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo: 'baz',
  };
  const store = createStore(defaultState);

  store.set(newState);

  expect(store.get()).toEqual(newState);
  expect(store.redux.getState()).toEqual(newState);
});

test('does not shallow merge states', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo2: 'baz',
  };
  const store = createStore<any>(defaultState);

  store.set(newState);

  expect(store.get()).toEqual(newState);
  expect(store.redux.getState()).toEqual(newState);
});

test('can subscribe and unsubscribe to state changes', () => {
  const store = createStore<any>({});
  const spy = jest.fn();
  const subscription = store.state$.subscribe(spy);
  store.set({ a: 1 });
  store.set({ a: 2 });
  subscription.unsubscribe();
  store.set({ a: 3 });

  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy.mock.calls[1][0]).toEqual({ a: 2 });
});

test('multiple subscribers can subscribe', () => {
  const store = createStore<any>({});
  const spy1 = jest.fn();
  const spy2 = jest.fn();
  const subscription1 = store.state$.subscribe(spy1);
  const subscription2 = store.state$.subscribe(spy2);
  store.set({ a: 1 });
  subscription1.unsubscribe();
  store.set({ a: 2 });
  subscription2.unsubscribe();
  store.set({ a: 3 });

  expect(spy1).toHaveBeenCalledTimes(1);
  expect(spy2).toHaveBeenCalledTimes(2);
  expect(spy1.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy2.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy2.mock.calls[1][0]).toEqual({ a: 2 });
});

test('creates impure mutators from pure mutators', () => {
  const store = createStore<any>({});
  const mutators = store.createMutators({
    setFoo: _ => bar => ({ foo: bar }),
  });

  expect(typeof mutators.setFoo).toBe('function');
});

test('mutators can update state', () => {
  const store = createStore<any>({
    value: 0,
    foo: 'bar',
  });
  const mutators = store.createMutators({
    add: state => increment => ({ ...state, value: state.value + increment }),
    setFoo: state => bar => ({ ...state, foo: bar }),
  });

  expect(store.get()).toEqual({
    value: 0,
    foo: 'bar',
  });

  mutators.add(11);
  mutators.setFoo('baz');

  expect(store.get()).toEqual({
    value: 11,
    foo: 'baz',
  });

  mutators.add(-20);
  mutators.setFoo('bazooka');

  expect(store.get()).toEqual({
    value: -9,
    foo: 'bazooka',
  });
});

test('mutators methods are not bound', () => {
  const store = createStore<any>({ value: -3 });
  const { add } = store.createMutators({
    add: state => increment => ({ ...state, value: state.value + increment }),
  });

  expect(store.get()).toEqual({ value: -3 });
  add(4);
  expect(store.get()).toEqual({ value: 1 });
});

test('created mutators are saved in store object', () => {
  const store = createStore<
    any,
    {
      add: (increment: number) => void;
    }
  >({ value: -3 });

  store.createMutators({
    add: state => increment => ({ ...state, value: state.value + increment }),
  });

  expect(typeof store.mutators.add).toBe('function');
  store.mutators.add(5);
  expect(store.get()).toEqual({ value: 2 });
});
