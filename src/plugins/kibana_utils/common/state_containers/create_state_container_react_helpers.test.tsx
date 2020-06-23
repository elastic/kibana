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

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import { createStateContainer } from './create_state_container';
import { createStateContainerReactHelpers } from './create_state_container_react_helpers';

let container: HTMLDivElement | null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container!);
  container = null;
});

test('can create React context', () => {
  const context = createStateContainerReactHelpers();

  expect(context).toMatchObject({
    Provider: expect.any(Object),
    Consumer: expect.any(Object),
    connect: expect.any(Function),
    context: expect.any(Object),
  });
});

test('<Provider> passes state to <Consumer>', () => {
  const stateContainer = createStateContainer({ hello: 'world' });
  const { Provider, Consumer } = createStateContainerReactHelpers<typeof stateContainer>();

  ReactDOM.render(
    <Provider value={stateContainer}>
      <Consumer>{(s: typeof stateContainer) => s.get().hello}</Consumer>
    </Provider>,
    container
  );

  expect(container!.innerHTML).toBe('world');
});

interface State1 {
  hello: string;
}

interface Props1 {
  message: string;
  stop: '.' | '!' | '?';
}

test('<Provider> passes state to connect()()', () => {
  const stateContainer = createStateContainer({ hello: 'Bob' });
  const { Provider, connect } = createStateContainerReactHelpers<typeof stateContainer>();

  const Demo: React.FC<Props1> = ({ message, stop }) => (
    <>
      {message}
      {stop}
    </>
  );
  const mergeProps = ({ hello }: State1) => ({ message: hello });
  const DemoConnected = connect<Props1, 'message'>(mergeProps)(Demo);

  ReactDOM.render(
    <Provider value={stateContainer}>
      <DemoConnected stop="?" />
    </Provider>,
    container
  );

  expect(container!.innerHTML).toBe('Bob?');
});

test('context receives stateContainer', () => {
  const stateContainer = createStateContainer({ foo: 'bar' });
  const { Provider, context } = createStateContainerReactHelpers<typeof stateContainer>();

  ReactDOM.render(
    /* eslint-disable no-shadow */
    <Provider value={stateContainer}>
      <context.Consumer>{(stateContainer) => stateContainer.get().foo}</context.Consumer>
    </Provider>,
    /* eslint-enable no-shadow */
    container
  );

  expect(container!.innerHTML).toBe('bar');
});

test.todo('can use multiple stores in one React app');

describe('hooks', () => {
  describe('useStore', () => {
    test('can select store using useContainer hook', () => {
      const stateContainer = createStateContainer({ foo: 'bar' });
      const { Provider, useContainer } = createStateContainerReactHelpers<typeof stateContainer>();
      const Demo: React.FC<{}> = () => {
        // eslint-disable-next-line no-shadow
        const stateContainer = useContainer();
        return <>{stateContainer.get().foo}</>;
      };

      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('bar');
    });
  });

  describe('useState', () => {
    test('can select state using useState hook', () => {
      const stateContainer = createStateContainer({ foo: 'qux' });
      const { Provider, useState } = createStateContainerReactHelpers<typeof stateContainer>();
      const Demo: React.FC<{}> = () => {
        const { foo } = useState();
        return <>{foo}</>;
      };

      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('qux');
    });

    test('re-renders when state changes', () => {
      const stateContainer = createStateContainer(
        { foo: 'bar' },
        {
          setFoo: (state: { foo: string }) => (foo: string) => ({ ...state, foo }),
        }
      );
      const { Provider, useState } = createStateContainerReactHelpers<typeof stateContainer>();
      const Demo: React.FC<{}> = () => {
        const { foo } = useState();
        return <>{foo}</>;
      };

      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('bar');
      act(() => {
        stateContainer.transitions.setFoo('baz');
      });
      expect(container!.innerHTML).toBe('baz');
    });
  });

  describe('useTransitions', () => {
    test('useTransitions hook returns mutations that can update state', () => {
      const stateContainer = createStateContainer(
        {
          cnt: 0,
        },
        {
          increment: (state: { cnt: number }) => (value: number) => ({
            ...state,
            cnt: state.cnt + value,
          }),
        }
      );

      const { Provider, useState, useTransitions } = createStateContainerReactHelpers<
        typeof stateContainer
      >();
      const Demo: React.FC<{}> = () => {
        const { cnt } = useState();
        const { increment } = useTransitions();
        return (
          <>
            <strong>{cnt}</strong>
            <button onClick={() => increment(10)}>Increment</button>
          </>
        );
      };

      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.querySelector('strong')!.innerHTML).toBe('0');
      act(() => {
        Simulate.click(container!.querySelector('button')!, {});
      });
      expect(container!.querySelector('strong')!.innerHTML).toBe('10');
      act(() => {
        Simulate.click(container!.querySelector('button')!, {});
      });
      expect(container!.querySelector('strong')!.innerHTML).toBe('20');
    });
  });

  describe('useSelector', () => {
    test('can select deeply nested value', () => {
      const stateContainer = createStateContainer({
        foo: {
          bar: {
            baz: 'qux',
          },
        },
      });
      const selector = (state: { foo: { bar: { baz: string } } }) => state.foo.bar.baz;
      const { Provider, useSelector } = createStateContainerReactHelpers<typeof stateContainer>();
      const Demo: React.FC<{}> = () => {
        const value = useSelector(selector);
        return <>{value}</>;
      };

      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('qux');
    });

    test('re-renders when state changes', () => {
      const stateContainer = createStateContainer({
        foo: {
          bar: {
            baz: 'qux',
          },
        },
      });
      const selector = (state: { foo: { bar: { baz: string } } }) => state.foo.bar.baz;
      const { Provider, useSelector } = createStateContainerReactHelpers();
      const Demo: React.FC<{}> = () => {
        const value = useSelector(selector);
        return <>{value}</>;
      };

      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('qux');
      act(() => {
        stateContainer.set({
          foo: {
            bar: {
              baz: 'quux',
            },
          },
        });
      });
      expect(container!.innerHTML).toBe('quux');
    });

    test("re-renders only when selector's result changes", async () => {
      const stateContainer = createStateContainer({ a: 'b', foo: 'bar' });
      const selector = (state: { foo: string }) => state.foo;
      const { Provider, useSelector } = createStateContainerReactHelpers<typeof stateContainer>();

      let cnt = 0;
      const Demo: React.FC<{}> = () => {
        cnt++;
        const value = useSelector(selector);
        return <>{value}</>;
      };
      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(1);

      act(() => {
        stateContainer.set({ a: 'c', foo: 'bar' });
      });

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(1);

      act(() => {
        stateContainer.set({ a: 'd', foo: 'bar 2' });
      });

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(2);
    });

    test('does not re-render on same shape object', async () => {
      const stateContainer = createStateContainer({ foo: { bar: 'baz' } });
      const selector = (state: { foo: any }) => state.foo;
      const { Provider, useSelector } = createStateContainerReactHelpers<typeof stateContainer>();

      let cnt = 0;
      const Demo: React.FC<{}> = () => {
        cnt++;
        const value = useSelector(selector);
        return <>{JSON.stringify(value)}</>;
      };
      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(1);

      act(() => {
        stateContainer.set({ foo: { bar: 'baz' } });
      });

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(1);

      act(() => {
        stateContainer.set({ foo: { bar: 'qux' } });
      });

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(2);
    });

    test('can set custom comparator function to prevent re-renders on deep equality', async () => {
      const stateContainer = createStateContainer(
        { foo: { bar: 'baz' } },
        {
          set: () => (newState: { foo: { bar: string } }) => newState,
        }
      );
      const selector = (state: { foo: any }) => state.foo;
      const comparator = (prev: any, curr: any) => JSON.stringify(prev) === JSON.stringify(curr);
      const { Provider, useSelector } = createStateContainerReactHelpers<typeof stateContainer>();

      let cnt = 0;
      const Demo: React.FC<{}> = () => {
        cnt++;
        const value = useSelector(selector, comparator);
        return <>{JSON.stringify(value)}</>;
      };
      ReactDOM.render(
        <Provider value={stateContainer}>
          <Demo />
        </Provider>,
        container
      );

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(1);

      act(() => {
        stateContainer.set({ foo: { bar: 'baz' } });
      });

      await new Promise((r) => setTimeout(r, 1));
      expect(cnt).toBe(1);
    });

    test.todo('unsubscribes when React un-mounts');
  });
});
