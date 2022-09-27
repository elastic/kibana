/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';
import { createRoot } from 'react-dom/client';
import { context, createKibanaReactContext, useKibana, KibanaContextProvider } from './context';
import { coreMock, overlayServiceMock } from '@kbn/core/public/mocks';
import { CoreStart } from '@kbn/core/public';

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
  if (container) {
    createRoot(container).render(
      <context.Provider value={{ services } as any}>
        <div>Hello world</div>
      </context.Provider>
    );
  }
});

const TestConsumer = () => {
  const { services } = useKibana<{ foo: string }>();
  return <div>{services.foo}</div>;
};

test('useKibana() hook retrieves Kibana context', () => {
  const core = coreMock.createStart();
  (core as any).foo = 'bar';
  if (container) {
    createRoot(container).render(
      <context.Provider value={{ services: core } as any}>
        <TestConsumer />
      </context.Provider>
    );
  }

  const div = container!.querySelector('div');
  expect(div!.textContent).toBe('bar');
});

test('createContext() creates context that can be consumed by useKibana() hook', () => {
  const services = {
    foo: 'baz',
  } as Partial<CoreStart>;
  const { Provider } = createKibanaReactContext(services);
  if (container) {
    createRoot(container).render(
      <Provider>
        <TestConsumer />
      </Provider>
    );
  }

  const div = container!.querySelector('div');
  expect(div!.textContent).toBe('baz');
});

test('services, notifications and overlays objects are always available', () => {
  const { Provider } = createKibanaReactContext({});
  const Test: FC = () => {
    const kibana = useKibana();
    expect(kibana).toMatchObject({
      services: expect.any(Object),
      notifications: expect.any(Object),
      overlays: expect.any(Object),
    });
    return null;
  };
  if (container) {
    createRoot(container).render(
      <Provider>
        <Test />
      </Provider>
    );
  }
});

test('<KibanaContextProvider> provider provides default kibana-react context', () => {
  const Test: FC = () => {
    const kibana = useKibana();
    expect(kibana).toMatchObject({
      services: expect.any(Object),
      notifications: expect.any(Object),
      overlays: expect.any(Object),
    });
    return null;
  };
  if (container) {
    createRoot(container).render(
      <KibanaContextProvider>
        <Test />
      </KibanaContextProvider>
    );
  }
});

test('<KibanaContextProvider> can set custom services in context', () => {
  const Test: FC = () => {
    const { services } = useKibana<{ test: string }>();
    expect(services.test).toBe('quux');
    return null;
  };
  if (container) {
    createRoot(container).render(
      <KibanaContextProvider services={{ test: 'quux' }}>
        <Test />
      </KibanaContextProvider>
    );
  }
});

test('nested <KibanaContextProvider> override and merge services', () => {
  const Test: FC = () => {
    const { services } = useKibana<{ foo: string; bar: string; baz: string }>();
    expect(services.foo).toBe('foo2');
    expect(services.bar).toBe('bar');
    expect(services.baz).toBe('baz3');
    return null;
  };
  if (container) {
    createRoot(container).render(
      <KibanaContextProvider services={{ foo: 'foo', bar: 'bar', baz: 'baz' }}>
        <KibanaContextProvider services={{ foo: 'foo2' }}>
          <KibanaContextProvider services={{ baz: 'baz3' }}>
            <Test />
          </KibanaContextProvider>
        </KibanaContextProvider>
      </KibanaContextProvider>
    );
  }
});

test('overlays wrapper uses the closest overlays service', () => {
  const Test: FC = () => {
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

  if (container) {
    createRoot(container).render(
      <KibanaContextProvider services={core1}>
        <KibanaContextProvider services={core2}>
          <Test />
        </KibanaContextProvider>
      </KibanaContextProvider>
    );
  }

  expect(core1.overlays!.openFlyout).toHaveBeenCalledTimes(0);
  expect(core1.overlays!.openModal).toHaveBeenCalledTimes(0);
  expect(core2.overlays!.openFlyout).toHaveBeenCalledTimes(1);
  expect(core2.overlays!.openModal).toHaveBeenCalledTimes(1);
});

test('notifications wrapper uses the closest notifications service', () => {
  const Test: FC = () => {
    const { notifications } = useKibana();
    notifications.toasts.show({} as any);
    return null;
  };

  const core1 = {
    notifications: {
      toasts: {
        add: jest.fn(),
      },
    } as unknown as CoreStart['notifications'],
  } as Partial<CoreStart>;

  const core2 = {
    notifications: {
      toasts: {
        add: jest.fn(),
      },
    } as unknown as CoreStart['notifications'],
  } as Partial<CoreStart>;

  if (container) {
    createRoot(container).render(
      <KibanaContextProvider services={core1}>
        <KibanaContextProvider services={core2}>
          <Test />
        </KibanaContextProvider>
      </KibanaContextProvider>
    );
  }

  expect(core1.notifications!.toasts.add).toHaveBeenCalledTimes(0);
  expect(core2.notifications!.toasts.add).toHaveBeenCalledTimes(1);
});

test('overlays wrapper uses available overlays service, higher up in <KibanaContextProvider> tree', () => {
  const Test: FC = () => {
    const { overlays } = useKibana();
    overlays.openFlyout({} as any);
    return null;
  };

  const core1 = {
    overlays: overlayServiceMock.createStartContract(),
    notifications: {
      toasts: {
        add: jest.fn(),
      },
    } as unknown as CoreStart['notifications'],
  } as Partial<CoreStart>;

  const core2 = {
    notifications: {
      toasts: {
        add: jest.fn(),
      },
    } as unknown as CoreStart['notifications'],
  } as Partial<CoreStart>;

  expect(core1.overlays!.openFlyout).toHaveBeenCalledTimes(0);

  if (container) {
    createRoot(container).render(
      <KibanaContextProvider services={core1}>
        <KibanaContextProvider services={core2}>
          <Test />
        </KibanaContextProvider>
      </KibanaContextProvider>
    );
  }

  expect(core1.overlays!.openFlyout).toHaveBeenCalledTimes(1);
});
