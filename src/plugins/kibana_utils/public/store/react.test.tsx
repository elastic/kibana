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

test('<Provider> passes state to connect()()', () => {
  const store = createStore({ hello: 'Bob' });
  const { Provider, connect } = createContext(store);

  const Demo: React.FC<{ message: string }> = ({ message }) => <>{message}</>;
  const mergeProps = ({ hello }: any) => ({ message: hello });
  const DemoConnected: React.FC<{}> = connect(mergeProps)(Demo) as any;

  ReactDOM.render(
    <Provider>
      <DemoConnected />
    </Provider>,
    container
  );

  expect(container!.innerHTML).toBe('Bob');
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
