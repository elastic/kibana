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

test('can create state container', () => {
  const stateContainer = createStateContainer({});
  expect(stateContainer).toMatchObject({
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
  const stateContainer = createStateContainer(defaultState);
  expect(stateContainer.get()).toEqual(defaultState);
  expect(stateContainer.getState()).toEqual(defaultState);
});

test('can set state', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo: 'baz',
  };
  const stateContainer = createStateContainer(defaultState);

  stateContainer.set(newState);

  expect(stateContainer.get()).toEqual(newState);
  expect(stateContainer.getState()).toEqual(newState);
});

test('does not shallow merge states', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo2: 'baz',
  };
  const stateContainer = createStateContainer(defaultState);

  stateContainer.set(newState as any);

  expect(stateContainer.get()).toEqual(newState);
  expect(stateContainer.getState()).toEqual(newState);
});

test('can subscribe and unsubscribe to state changes', () => {
  const stateContainer = createStateContainer({});
  const spy = jest.fn();
  const subscription = stateContainer.state$.subscribe(spy);
  stateContainer.set({ a: 1 });
  stateContainer.set({ a: 2 });
  subscription.unsubscribe();
  stateContainer.set({ a: 3 });

  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy.mock.calls[1][0]).toEqual({ a: 2 });
});

test('multiple subscribers can subscribe', () => {
  const stateContainer = createStateContainer({});
  const spy1 = jest.fn();
  const spy2 = jest.fn();
  const subscription1 = stateContainer.state$.subscribe(spy1);
  const subscription2 = stateContainer.state$.subscribe(spy2);
  stateContainer.set({ a: 1 });
  subscription1.unsubscribe();
  stateContainer.set({ a: 2 });
  subscription2.unsubscribe();
  stateContainer.set({ a: 3 });

  expect(spy1).toHaveBeenCalledTimes(1);
  expect(spy2).toHaveBeenCalledTimes(2);
  expect(spy1.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy2.mock.calls[0][0]).toEqual({ a: 1 });
  expect(spy2.mock.calls[1][0]).toEqual({ a: 2 });
});

test('can create state container without transitions', () => {
  const state = { foo: 'bar' };
  const stateContainer = createStateContainer(state);
  expect(stateContainer.transitions).toEqual({});
  expect(stateContainer.get()).toEqual(state);
});

test('creates transitions', () => {
  const stateContainer = createStateContainer(
    {},
    {
      setFoo: () => (bar: any) => ({ foo: bar }),
    }
  );

  expect(typeof stateContainer.transitions.setFoo).toBe('function');
});

test('transitions can update state', () => {
  const stateContainer = createStateContainer(
    {
      value: 0,
      foo: 'bar',
    },
    {
      add: (state: any) => (increment: any) => ({ ...state, value: state.value + increment }),
      setFoo: (state: any) => (bar: any) => ({ ...state, foo: bar }),
    }
  );

  expect(stateContainer.get()).toEqual({
    value: 0,
    foo: 'bar',
  });

  stateContainer.transitions.add(11);
  stateContainer.transitions.setFoo('baz');

  expect(stateContainer.get()).toEqual({
    value: 11,
    foo: 'baz',
  });

  stateContainer.transitions.add(-20);
  stateContainer.transitions.setFoo('bazooka');

  expect(stateContainer.get()).toEqual({
    value: -9,
    foo: 'bazooka',
  });
});

test('transitions methods are not bound', () => {
  const stateContainer = createStateContainer(
    { value: -3 },
    {
      add: (state: { value: number }) => (increment: number) => ({
        ...state,
        value: state.value + increment,
      }),
    }
  );

  expect(stateContainer.get()).toEqual({ value: -3 });
  stateContainer.transitions.add(4);
  expect(stateContainer.get()).toEqual({ value: 1 });
});

test('created transitions are saved in stateContainer object', () => {
  const stateContainer = createStateContainer(
    { value: -3 },
    {
      add: (state: { value: number }) => (increment: number) => ({
        ...state,
        value: state.value + increment,
      }),
    }
  );

  expect(typeof stateContainer.transitions.add).toBe('function');
  stateContainer.transitions.add(5);
  expect(stateContainer.get()).toEqual({ value: 2 });
});

test('throws when state is modified inline', () => {
  const container = createStateContainer({ a: 'b', array: [{ a: 'b' }] });

  expect(() => {
    (container.get().a as any) = 'c';
  }).toThrowErrorMatchingInlineSnapshot(
    `"Cannot assign to read only property 'a' of object '#<Object>'"`
  );

  expect(() => {
    (container.getState().a as any) = 'c';
  }).toThrowErrorMatchingInlineSnapshot(
    `"Cannot assign to read only property 'a' of object '#<Object>'"`
  );

  expect(() => {
    (container.getState().array as any).push('c');
  }).toThrowErrorMatchingInlineSnapshot(`"Cannot add property 1, object is not extensible"`);

  expect(() => {
    (container.getState().array[0] as any).c = 'b';
  }).toThrowErrorMatchingInlineSnapshot(`"Cannot add property c, object is not extensible"`);

  expect(() => {
    container.set(null as any);
    expect(container.getState()).toBeNull();
  }).not.toThrow();
});

test('throws when state is modified inline in subscription', () => {
  const container = createStateContainer({ a: 'b' }, { set: () => (newState: any) => newState });

  container.subscribe((value) => {
    expect(() => {
      (value.a as any) = 'd';
    }).toThrowErrorMatchingInlineSnapshot(
      `"Cannot assign to read only property 'a' of object '#<Object>'"`
    );
  });

  container.transitions.set({ a: 'c' });
});

describe('selectors', () => {
  test('can specify no selectors, or can skip them', () => {
    createStateContainer({});
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
