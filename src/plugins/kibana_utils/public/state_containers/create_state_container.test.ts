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

import { createStateContainer } from './create_state_container';

const create = <S, T extends object>(state: S, transitions: T = {} as T) => {
  const pureTransitions = {
    set: () => (newState: S) => newState,
    ...transitions,
  };
  const store = createStateContainer<typeof state, typeof pureTransitions>(state, pureTransitions);
  return { store, mutators: store.transitions };
};

test('can create store', () => {
  const { store } = create({});
  expect(store).toMatchObject({
    getState: expect.any(Function),
    state$: expect.any(Object),
    transitions: expect.any(Object),
    dispatch: expect.any(Function),
    subscribe: expect.any(Function),
    replaceReducer: expect.any(Function),
    addMiddleware: expect.any(Function),
  });
});

test('can set default state', () => {
  const defaultState = {
    foo: 'bar',
  };
  const { store } = create(defaultState);
  expect(store.get()).toEqual(defaultState);
  expect(store.getState()).toEqual(defaultState);
});

test('can set state', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo: 'baz',
  };
  const { store, mutators } = create(defaultState);

  mutators.set(newState);

  expect(store.get()).toEqual(newState);
  expect(store.getState()).toEqual(newState);
});

test('does not shallow merge states', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo2: 'baz',
  };
  const { store, mutators } = create(defaultState);

  mutators.set(newState as any);

  expect(store.get()).toEqual(newState);
  expect(store.getState()).toEqual(newState);
});

test('can subscribe and unsubscribe to state changes', () => {
  const { store, mutators } = create({});
  const spy = jest.fn();
  const subscription = store.state$.subscribe(spy);
  mutators.set({ a: 1 });
  mutators.set({ a: 2 });
  subscription.unsubscribe();
  mutators.set({ a: 3 });

  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy.mock.calls[1][0]).toEqual({ a: 2 });
});

test('multiple subscribers can subscribe', () => {
  const { store, mutators } = create({});
  const spy1 = jest.fn();
  const spy2 = jest.fn();
  const subscription1 = store.state$.subscribe(spy1);
  const subscription2 = store.state$.subscribe(spy2);
  mutators.set({ a: 1 });
  subscription1.unsubscribe();
  mutators.set({ a: 2 });
  subscription2.unsubscribe();
  mutators.set({ a: 3 });

  expect(spy1).toHaveBeenCalledTimes(1);
  expect(spy2).toHaveBeenCalledTimes(2);
  expect(spy1.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy2.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy2.mock.calls[1][0]).toEqual({ a: 2 });
});

test('creates impure mutators from pure mutators', () => {
  const { mutators } = create(
    {},
    {
      setFoo: () => (bar: any) => ({ foo: bar }),
    }
  );

  expect(typeof mutators.setFoo).toBe('function');
});

test('mutators can update state', () => {
  const { store, mutators } = create(
    {
      value: 0,
      foo: 'bar',
    },
    {
      add: (state: any) => (increment: any) => ({ ...state, value: state.value + increment }),
      setFoo: (state: any) => (bar: any) => ({ ...state, foo: bar }),
    }
  );

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
  const { store, mutators } = create(
    { value: -3 },
    {
      add: (state: { value: number }) => (increment: number) => ({
        ...state,
        value: state.value + increment,
      }),
    }
  );

  expect(store.get()).toEqual({ value: -3 });
  mutators.add(4);
  expect(store.get()).toEqual({ value: 1 });
});

test('created mutators are saved in store object', () => {
  const { store, mutators } = create(
    { value: -3 },
    {
      add: (state: { value: number }) => (increment: number) => ({
        ...state,
        value: state.value + increment,
      }),
    }
  );

  expect(typeof store.transitions.add).toBe('function');
  mutators.add(5);
  expect(store.get()).toEqual({ value: 2 });
});

test('throws when state is modified inline - 1', () => {
  const container = createStateContainer({ a: 'b' }, {});

  let error: TypeError | null = null;
  try {
    (container.get().a as any) = 'c';
  } catch (err) {
    error = err;
  }

  expect(error).toBeInstanceOf(TypeError);
});

test('throws when state is modified inline - 2', () => {
  const container = createStateContainer({ a: 'b' }, {});

  let error: TypeError | null = null;
  try {
    (container.getState().a as any) = 'c';
  } catch (err) {
    error = err;
  }

  expect(error).toBeInstanceOf(TypeError);
});

test('throws when state is modified inline in subscription', done => {
  const container = createStateContainer({ a: 'b' }, { set: () => (newState: any) => newState });

  container.subscribe(value => {
    let error: TypeError | null = null;
    try {
      (value.a as any) = 'd';
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(TypeError);
    done();
  });
  container.transitions.set({ a: 'c' });
});

describe('selectors', () => {
  test('can specify no selectors, or can skip them', () => {
    createStateContainer({}, {});
    createStateContainer({}, {}, {});
  });

  test('selector object is available on .selectors key', () => {
    const container1 = createStateContainer({}, {}, {});
    const container2 = createStateContainer({}, {}, { foo: () => () => 123 });
    const container3 = createStateContainer({}, {}, { bar: () => () => 1, baz: () => () => 1 });

    expect(Object.keys(container1.selectors).sort()).toEqual([]);
    expect(Object.keys(container2.selectors).sort()).toEqual(['foo']);
    expect(Object.keys(container3.selectors).sort()).toEqual(['bar', 'baz']);
  });

  test('selector without arguments returns correct state slice', () => {
    const container = createStateContainer(
      { name: 'Oleg' },
      {
        changeName: (state: { name: string }) => (name: string) => ({ ...state, name }),
      },
      { getName: (state: { name: string }) => () => state.name }
    );

    expect(container.selectors.getName()).toBe('Oleg');
    container.transitions.changeName('Britney');
    expect(container.selectors.getName()).toBe('Britney');
  });

  test('selector can accept an argument', () => {
    const container = createStateContainer(
      {
        users: {
          1: {
            name: 'Darth',
          },
        },
      },
      {},
      {
        getUser: (state: any) => (id: number) => state.users[id],
      }
    );

    expect(container.selectors.getUser(1)).toEqual({ name: 'Darth' });
    expect(container.selectors.getUser(2)).toBe(undefined);
  });

  test('selector can accept multiple arguments', () => {
    const container = createStateContainer(
      {
        users: {
          5: {
            name: 'Darth',
            surname: 'Vader',
          },
        },
      },
      {},
      {
        getName: (state: any) => (id: number, which: 'name' | 'surname') => state.users[id][which],
      }
    );

    expect(container.selectors.getName(5, 'name')).toEqual('Darth');
    expect(container.selectors.getName(5, 'surname')).toEqual('Vader');
  });
});
