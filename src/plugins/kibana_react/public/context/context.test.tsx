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
import { context, createContext, useKibana } from './context';
import { coreMock } from '../../../../core/public/mocks';

let container: HTMLDivElement | null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container!);
  container = null;
});

test('can mount <Provider> without crashing', () => {
  const core = coreMock.createStart();
  ReactDOM.render(
    <context.Provider value={{ services: core, overlays: undefined, notifications: undefined }}>
      <div>Hello world</div>
    </context.Provider>,
    container
  );
});

const TestConsumer = () => {
  const { services: core } = useKibana();
  return <div>{(core as any).foo}</div>;
};

test('useKibana() hook retrieves Kibana context', () => {
  const core = coreMock.createStart();
  (core as any).foo = 'bar';
  ReactDOM.render(
    <context.Provider value={{ services: core, overlays: undefined, notifications: undefined }}>
      <TestConsumer />
    </context.Provider>,
    container
  );

  const div = container!.querySelector('div');
  expect(div!.textContent).toBe('bar');
});

test('createContext() creates context that can be consumed by useKibana() hook', () => {
  const core = coreMock.createStart();
  (core as any).foo = 'baz';
  const { Provider } = createContext(core);

  ReactDOM.render(
    <Provider>
      <TestConsumer />
    </Provider>,
    container
  );

  const div = container!.querySelector('div');
  expect(div!.textContent).toBe('baz');
});
