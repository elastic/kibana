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
import { context, createKibanaReactContext, useKibana, KibanaContextProvider } from './context';
import { coreMock, overlayServiceMock } from '../../../../core/public/mocks';
import { CoreStart } from '../../../../core/public';

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
  const services = coreMock.createStart();
  ReactDOM.render(
    <context.Provider value={{ services } as any}>
      <div>Hello world</div>
    </context.Provider>,
    container
  );
});

const TestConsumer = () => {
  const { services } = useKibana<{ foo: string }>();
  return <div>{services.foo}</div>;
};

test('useKibana() hook retrieves Kibana context', () => {
  const core = coreMock.createStart();
  (core as any).foo = 'bar';
  ReactDOM.render(
    <context.Provider value={{ services: core } as any}>
      <TestConsumer />
    </context.Provider>,
    container
  );

  const div = container!.querySelector('div');
  expect(div!.textContent).toBe('bar');
});

test('createContext() creates context that can be consumed by useKibana() hook', () => {
  const services = {
    foo: 'baz',
  } as Partial<CoreStart>;
  const { Provider } = createKibanaReactContext(services);

  ReactDOM.render(
    <Provider>
      <TestConsumer />
    </Provider>,
    container
  );

  const div = container!.querySelector('div');
  expect(div!.textContent).toBe('baz');
});

test('services, notifications and overlays objects are always available', () => {
  const { Provider } = createKibanaReactContext({});
  const Test: React.FC = () => {
    const kibana = useKibana();
    expect(kibana).toMatchObject({
      services: expect.any(Object),
      notifications: expect.any(Object),
      overlays: expect.any(Object),
    });
    return null;
  };

  ReactDOM.render(
    <Provider>
      <Test />
    </Provider>,
    container
  );
});

test('<KibanaContextProvider> provider provides default kibana-react context', () => {
  const Test: React.FC = () => {
    const kibana = useKibana();
    expect(kibana).toMatchObject({
      services: expect.any(Object),
      notifications: expect.any(Object),
      overlays: expect.any(Object),
    });
    return null;
  };

  ReactDOM.render(
    <KibanaContextProvider>
      <Test />
    </KibanaContextProvider>,
    container
  );
});

test('<KibanaContextProvider> can set custom services in context', () => {
  const Test: React.FC = () => {
    const { services } = useKibana();
    expect(services.test).toBe('quux');
    return null;
  };

  ReactDOM.render(
    <KibanaContextProvider services={{ test: 'quux' }}>
      <Test />
    </KibanaContextProvider>,
    container
  );
});

test('nested <KibanaContextProvider> override and merge services', () => {
  const Test: React.FC = () => {
    const { services } = useKibana();
    expect(services.foo).toBe('foo2');
    expect(services.bar).toBe('bar');
    expect(services.baz).toBe('baz3');
    return null;
  };

  ReactDOM.render(
    <KibanaContextProvider services={{ foo: 'foo', bar: 'bar', baz: 'baz' }}>
      <KibanaContextProvider services={{ foo: 'foo2' }}>
        <KibanaContextProvider services={{ baz: 'baz3' }}>
          <Test />
        </KibanaContextProvider>
      </KibanaContextProvider>
    </KibanaContextProvider>,
    container
  );
});

test('overlays wrapper uses the closest overlays service', () => {
  const Test: React.FC = () => {
    const { overlays } = useKibana();
    overlays.openFlyout({} as any);
    overlays.openModal({} as any);
    return null;
  };

  const core1 = {
    overlays: overlayServiceMock.createStartContract(),
  } as Partial<CoreStart>;

  const core2 = {
    overlays: overlayServiceMock.createStartContract(),
  } as Partial<CoreStart>;

  ReactDOM.render(
    <KibanaContextProvider services={core1}>
      <KibanaContextProvider services={core2}>
        <Test />
      </KibanaContextProvider>
    </KibanaContextProvider>,
    container
  );

  expect(core1.overlays!.openFlyout).toHaveBeenCalledTimes(0);
  expect(core1.overlays!.openModal).toHaveBeenCalledTimes(0);
  expect(core2.overlays!.openFlyout).toHaveBeenCalledTimes(1);
  expect(core2.overlays!.openModal).toHaveBeenCalledTimes(1);
});

test('notifications wrapper uses the closest notifications service', () => {
  const Test: React.FC = () => {
    const { notifications } = useKibana();
    notifications.toasts.show({} as any);
    return null;
  };

  const core1 = {
    notifications: ({
      toasts: {
        add: jest.fn(),
      },
    } as unknown) as CoreStart['notifications'],
  } as Partial<CoreStart>;

  const core2 = {
    notifications: ({
      toasts: {
        add: jest.fn(),
      },
    } as unknown) as CoreStart['notifications'],
  } as Partial<CoreStart>;

  ReactDOM.render(
    <KibanaContextProvider services={core1}>
      <KibanaContextProvider services={core2}>
        <Test />
      </KibanaContextProvider>
    </KibanaContextProvider>,
    container
  );

  expect(core1.notifications!.toasts.add).toHaveBeenCalledTimes(0);
  expect(core2.notifications!.toasts.add).toHaveBeenCalledTimes(1);
});

test('overlays wrapper uses available overlays service, higher up in <KibanaContextProvider> tree', () => {
  const Test: React.FC = () => {
    const { overlays } = useKibana();
    overlays.openFlyout({} as any);
    return null;
  };

  const core1 = {
    overlays: overlayServiceMock.createStartContract(),
    notifications: ({
      toasts: {
        add: jest.fn(),
      },
    } as unknown) as CoreStart['notifications'],
  } as Partial<CoreStart>;

  const core2 = {
    notifications: ({
      toasts: {
        add: jest.fn(),
      },
    } as unknown) as CoreStart['notifications'],
  } as Partial<CoreStart>;

  expect(core1.overlays!.openFlyout).toHaveBeenCalledTimes(0);

  ReactDOM.render(
    <KibanaContextProvider services={core1}>
      <KibanaContextProvider services={core2}>
        <Test />
      </KibanaContextProvider>
    </KibanaContextProvider>,
    container
  );

  expect(core1.overlays!.openFlyout).toHaveBeenCalledTimes(1);
});
