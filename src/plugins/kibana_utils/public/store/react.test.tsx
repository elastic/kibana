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
import { createStore } from './create_store';
import { createContext } from './react';

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
  const store = createStore({ foo: 'bar' });
  const context = createContext(store);

  expect(context).toMatchObject({
    Provider: expect.any(Function),
    Consumer: expect.any(Function),
    connect: expect.any(Function),
    context: {
      Provider: expect.any(Object),
      Consumer: expect.any(Object),
    },
  });
});

test('<Provider> passes state to <Consumer>', () => {
  const store = createStore({ hello: 'world' });
  const { Provider, Consumer } = createContext(store);

  ReactDOM.render(
    <Provider>
      <Consumer>{({ hello }) => hello}</Consumer>
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
  const store = createStore<State1>({ hello: 'Bob' });
  const { Provider, connect } = createContext(store);

  const Demo: React.FC<Props1> = ({ message, stop }) => (
    <>
      {message}
      {stop}
    </>
  );
  const mergeProps = ({ hello }: State1) => ({ message: hello });
  const DemoConnected = connect<Props1, 'message'>(mergeProps)(Demo);

  ReactDOM.render(
    <Provider>
      <DemoConnected stop="?" />
    </Provider>,
    container
  );

  expect(container!.innerHTML).toBe('Bob?');
});

test('context receives Redux store', () => {
  const store = createStore({ foo: 'bar' });
  const { Provider, context } = createContext(store);

  ReactDOM.render(
    /* eslint-disable no-shadow */
    <Provider>
      <context.Consumer>{({ store }) => store.getState().foo}</context.Consumer>
    </Provider>,
    /* eslint-enable no-shadow */
    container
  );

  expect(container!.innerHTML).toBe('bar');
});

describe('hooks', () => {
  describe('useStore', () => {
    test('can select store using useStore hook', () => {
      const store = createStore({ foo: 'bar' });
      const { Provider, useStore } = createContext(store);
      const Demo: React.FC<{}> = () => {
        // eslint-disable-next-line no-shadow
        const store = useStore();
        return <>{store.get().foo}</>;
      };

      ReactDOM.render(
        <Provider>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('bar');
    });
  });

  describe('useState', () => {
    test('can select state using useState hook', () => {
      const store = createStore({ foo: 'qux' });
      const { Provider, useState } = createContext(store);
      const Demo: React.FC<{}> = () => {
        const { foo } = useState();
        return <>{foo}</>;
      };

      ReactDOM.render(
        <Provider>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('qux');
    });

    test('re-renders when state changes', () => {
      const store = createStore({ foo: 'bar' });
      const { setFoo } = store.createMutators({
        setFoo: state => foo => ({ ...state, foo }),
      });
      const { Provider, useState } = createContext(store);
      const Demo: React.FC<{}> = () => {
        const { foo } = useState();
        return <>{foo}</>;
      };

      ReactDOM.render(
        <Provider>
          <Demo />
        </Provider>,
        container
      );

      expect(container!.innerHTML).toBe('bar');
      act(() => {
        setFoo('baz');
      });
      expect(container!.innerHTML).toBe('baz');
    });
  });

  describe('useMutations', () => {
    test('useMutations hook returns mutations that can update state', () => {
      const store = createStore<
        {
          cnt: number;
        },
        {
          increment: (value: number) => void;
        }
      >({
        cnt: 0,
      });
      store.createMutators({
        increment: state => value => ({ ...state, cnt: state.cnt + value }),
      });

      const { Provider, useState, useMutators } = createContext(store);
      const Demo: React.FC<{}> = () => {
        const { cnt } = useState();
        const { increment } = useMutators();
        return (
          <>
            <strong>{cnt}</strong>
            <button onClick={() => increment(10)}>Increment</button>
          </>
        );
      };

      ReactDOM.render(
        <Provider>
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
});
