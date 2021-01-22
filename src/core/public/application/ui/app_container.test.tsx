/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';

import { AppContainer } from './app_container';
import { Mounter, AppMountParameters, AppStatus } from '../types';
import { createMemoryHistory } from 'history';
import { ScopedHistory } from '../scoped_history';

describe('AppContainer', () => {
  const appId = 'someApp';
  const setAppLeaveHandler = jest.fn();
  const setAppActionMenu = jest.fn();
  const setIsMounting = jest.fn();

  beforeEach(() => {
    setAppLeaveHandler.mockClear();
    setIsMounting.mockClear();
  });

  const flushPromises = async () => {
    await new Promise<void>(async (resolve) => {
      setImmediate(() => resolve());
    });
  };

  const createResolver = (): [Promise<void>, () => void] => {
    let resolve: () => void | undefined;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    return [promise, resolve!];
  };

  const createMounter = (promise: Promise<void>): Mounter => ({
    appBasePath: '/base-path',
    appRoute: '/some-route',
    unmountBeforeMounting: false,
    exactRoute: false,
    mount: async ({ element }: AppMountParameters) => {
      await promise;
      const container = document.createElement('div');
      container.innerHTML = 'some-content';
      element.appendChild(container);
      return () => container.remove();
    },
  });

  it('should hide the "not found" page before mounting the route', async () => {
    const [waitPromise, resolvePromise] = createResolver();
    const mounter = createMounter(waitPromise);

    const wrapper = mount(
      <AppContainer
        appPath={`/app/${appId}`}
        appId={appId}
        appStatus={AppStatus.inaccessible}
        mounter={mounter}
        setAppLeaveHandler={setAppLeaveHandler}
        setAppActionMenu={setAppActionMenu}
        setIsMounting={setIsMounting}
        createScopedHistory={(appPath: string) =>
          // Create a history using the appPath as the current location
          new ScopedHistory(createMemoryHistory({ initialEntries: [appPath] }), appPath)
        }
      />
    );

    expect(wrapper.text()).toContain('Application Not Found');

    wrapper.setProps({
      appId,
      setAppLeaveHandler,
      mounter,
      appStatus: AppStatus.accessible,
    });
    wrapper.update();

    expect(wrapper.text()).toEqual('');

    await act(async () => {
      resolvePromise();
      await flushPromises();
      wrapper.update();
    });

    expect(wrapper.text()).toContain('some-content');
  });

  it('should call setIsMounting while mounting', async () => {
    const [waitPromise, resolvePromise] = createResolver();
    const mounter = createMounter(waitPromise);

    const wrapper = mount(
      <AppContainer
        appPath={`/app/${appId}`}
        appId={appId}
        appStatus={AppStatus.accessible}
        mounter={mounter}
        setAppLeaveHandler={setAppLeaveHandler}
        setAppActionMenu={setAppActionMenu}
        setIsMounting={setIsMounting}
        createScopedHistory={(appPath: string) =>
          // Create a history using the appPath as the current location
          new ScopedHistory(createMemoryHistory({ initialEntries: [appPath] }), appPath)
        }
      />
    );

    expect(setIsMounting).toHaveBeenCalledTimes(1);
    expect(setIsMounting).toHaveBeenLastCalledWith(true);

    await act(async () => {
      resolvePromise();
      await flushPromises();
      wrapper.update();
    });

    expect(setIsMounting).toHaveBeenCalledTimes(2);
    expect(setIsMounting).toHaveBeenLastCalledWith(false);
  });

  it('should call setIsMounting(false) if mounting throws', async () => {
    const [waitPromise, resolvePromise] = createResolver();
    const mounter = {
      appBasePath: '/base-path/some-route',
      appRoute: '/some-route',
      unmountBeforeMounting: false,
      exactRoute: false,
      mount: async ({ element }: AppMountParameters) => {
        await waitPromise;
        throw new Error(`Mounting failed!`);
      },
    };

    const wrapper = mount(
      <AppContainer
        appPath={`/app/${appId}`}
        appId={appId}
        appStatus={AppStatus.accessible}
        mounter={mounter}
        setAppLeaveHandler={setAppLeaveHandler}
        setAppActionMenu={setAppActionMenu}
        setIsMounting={setIsMounting}
        createScopedHistory={(appPath: string) =>
          // Create a history using the appPath as the current location
          new ScopedHistory(createMemoryHistory({ initialEntries: [appPath] }), appPath)
        }
      />
    );

    expect(setIsMounting).toHaveBeenCalledTimes(1);
    expect(setIsMounting).toHaveBeenLastCalledWith(true);

    // await expect(
    await act(async () => {
      resolvePromise();
      await flushPromises();
      wrapper.update();
    });
    // ).rejects.toThrow();

    expect(setIsMounting).toHaveBeenCalledTimes(2);
    expect(setIsMounting).toHaveBeenLastCalledWith(false);
  });
});
