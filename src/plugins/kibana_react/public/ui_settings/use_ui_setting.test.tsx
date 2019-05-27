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
import { useUiSetting } from './use_ui_setting';
import { createContext } from '../core';
import { Core } from '../core/types';
import { createInMemoryCore } from '../core/memory';

let container: HTMLDivElement | null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container!);
  container = null;
});

const TestConsumer: React.FC<{
  setting: string;
  newValue?: string;
}> = ({ setting, newValue = '' }) => {
  const [value, set] = useUiSetting(setting, 'DEFAULT');

  return (
    <div>
      {setting}: <strong>{value}</strong>
      <button onClick={() => set(newValue)}>Set new value!</button>
    </div>
  );
};

test('synchronously returns the latest value', async () => {
  const core = createInMemoryCore() as Core;
  await core.uiSettings!.set('foo', 'bar');
  const { Provider } = createContext(core);

  ReactDOM.render(
    <Provider>
      <TestConsumer setting="foo" />
    </Provider>,
    container
  );

  const strong = container!.querySelector('strong');
  expect(strong!.textContent).toBe('bar');
});

test('returns default value on non-existing key', async () => {
  const core = createInMemoryCore() as Core;
  const { Provider } = createContext(core);

  ReactDOM.render(
    <Provider>
      <TestConsumer setting="non_existing" />
    </Provider>,
    container
  );

  const strong = container!.querySelector('strong');
  expect(strong!.textContent).toBe('DEFAULT');
});

test('re-renders with latest setting value as it changes', async () => {
  const core = createInMemoryCore() as Core;
  await core.uiSettings!.set('theme:darkMode', 'yes');
  const { Provider } = createContext(core);

  ReactDOM.render(
    <Provider>
      <TestConsumer setting="theme:darkMode" />
    </Provider>,
    container
  );

  const strong = container!.querySelector('strong');
  expect(strong!.textContent).toBe('yes');

  let promise;
  act(() => {
    promise = core.uiSettings!.set('theme:darkMode', 'no');
  });
  await promise;
  expect(strong!.textContent).toBe('no');

  act(() => {
    promise = core.uiSettings!.set('theme:darkMode', 'semidark');
  });
  await promise;
  expect(strong!.textContent).toBe('semidark');
});

test('can set new hook value', async () => {
  const core = createInMemoryCore() as Core;
  await core.uiSettings!.set('a', 'b');
  const { Provider } = createContext(core);

  ReactDOM.render(
    <Provider>
      <TestConsumer setting="a" newValue="c" />
    </Provider>,
    container
  );

  const strong = container!.querySelector('strong');
  expect(strong!.textContent).toBe('b');

  act(() => {
    Simulate.click(container!.querySelector('button')!, {});
  });

  expect(strong!.textContent).toBe('c');
});
