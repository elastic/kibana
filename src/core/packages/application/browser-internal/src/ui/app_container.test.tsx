/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { type AppMountParameters, AppStatus } from '@kbn/core-application-browser';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { AppContainer } from './app_container';
import type { Mounter } from '../types';
import { createMemoryHistory } from 'history';
import { CoreScopedHistory as ScopedHistory } from '../scoped_history';

describe('AppContainer', () => {
  const appId = 'someApp';
  const setAppLeaveHandler = jest.fn();
  const setAppActionMenu = jest.fn();
  const setIsMounting = jest.fn();
  const setAppNotFoundState = jest.fn();
  const theme$ = themeServiceMock.createTheme$();

  const createScopedHistory = (appPath: string) =>
    new ScopedHistory(createMemoryHistory({ initialEntries: [appPath] }), appPath);

  const defaultProps = {
    appPath: `/app/${appId}`,
    appId,
    setAppLeaveHandler,
    setAppActionMenu,
    setIsMounting,
    setAppNotFoundState,
    createScopedHistory,
    theme$,
  };

  beforeEach(() => {
    setAppLeaveHandler.mockClear();
    setIsMounting.mockClear();
    setAppNotFoundState.mockClear();
  });

  const flushPromises = async () => {
    await new Promise<void>(async (resolve, reject) => {
      try {
        setImmediate(() => resolve());
      } catch (error) {
        reject(error);
      }
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

  it('registers unavailable state for an inaccessible registered app', () => {
    const mounter = createMounter(Promise.resolve());

    mountWithIntl(
      <AppContainer {...defaultProps} appStatus={AppStatus.inaccessible} mounter={mounter} />
    );

    expect(setAppNotFoundState).toHaveBeenCalledWith(true);
  });

  it('registers unavailable state when the mounter is missing', () => {
    mountWithIntl(
      <AppContainer {...defaultProps} appStatus={AppStatus.inaccessible} mounter={undefined} />
    );

    expect(setAppNotFoundState).toHaveBeenCalledWith(true);
  });

  it('clears unavailable state and mounts an accessible app normally', async () => {
    const mounter: Mounter = {
      appBasePath: '/base-path',
      appRoute: '/some-route',
      unmountBeforeMounting: false,
      exactRoute: false,
      mount: jest.fn().mockImplementation(({ element }) => {
        const container = document.createElement('div');
        container.innerHTML = 'some-content';
        element.appendChild(container);
        return () => container.remove();
      }),
    };

    const wrapper = mountWithIntl(
      <AppContainer {...defaultProps} appStatus={AppStatus.accessible} mounter={mounter} />
    );

    expect(setAppNotFoundState).toHaveBeenCalledWith(false);

    await act(async () => {
      await flushPromises();
      wrapper.update();
    });

    expect(mounter.mount).toHaveBeenCalledTimes(1);
    expect(mounter.mount).toHaveBeenCalledWith({
      appBasePath: '/base-path',
      history: expect.any(ScopedHistory),
      element: expect.any(HTMLElement),
      theme$,
      onAppLeave: expect.any(Function),
      setHeaderActionMenu: expect.any(Function),
    });
  });

  it('clears unavailable state on unmount', () => {
    const wrapper = mountWithIntl(
      <AppContainer
        {...defaultProps}
        appStatus={AppStatus.inaccessible}
        mounter={createMounter(Promise.resolve())}
      />
    );

    setAppNotFoundState.mockClear();

    wrapper.unmount();

    expect(setAppNotFoundState).toHaveBeenCalledWith(false);
  });

  it('clears unavailable state when transitioning from unavailable to accessible', async () => {
    const [waitPromise, resolvePromise] = createResolver();
    const mounter = createMounter(waitPromise);

    const wrapper = mountWithIntl(
      <AppContainer {...defaultProps} appStatus={AppStatus.inaccessible} mounter={mounter} />
    );

    expect(wrapper.text()).toContain('Application unavailable');
    expect(setAppNotFoundState).toHaveBeenCalledWith(true);

    setAppNotFoundState.mockClear();

    wrapper.setProps({
      appStatus: AppStatus.accessible,
    });
    wrapper.update();

    expect(setAppNotFoundState).toHaveBeenCalledWith(false);
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

    const wrapper = mountWithIntl(
      <AppContainer {...defaultProps} appStatus={AppStatus.accessible} mounter={mounter} />
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

  it('should show plain spinner', async () => {
    const [waitPromise] = createResolver();
    const mounter = createMounter(waitPromise);

    const wrapper = mountWithIntl(
      <AppContainer
        {...defaultProps}
        appStatus={AppStatus.accessible}
        mounter={mounter}
        showPlainSpinner={true}
      />
    );
    expect(wrapper.find('[data-test-subj="appContainer-loadingSpinner"]').exists()).toBeTruthy();
  });

  it('should call setIsMounting(false) if mounting throws', async () => {
    const [waitPromise, resolvePromise] = createResolver();
    const analytics = analyticsServiceMock.createAnalyticsServiceStart();
    const mounter = {
      appBasePath: '/base-path/some-route',
      appRoute: '/some-route',
      unmountBeforeMounting: false,
      exactRoute: false,
      mount: async () => {
        await waitPromise;
        throw new Error(`Mounting failed!`);
      },
    };

    const wrapper = mountWithIntl(
      <KibanaErrorBoundaryProvider analytics={analytics}>
        <KibanaErrorBoundary>
          <AppContainer {...defaultProps} appStatus={AppStatus.accessible} mounter={mounter} />
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
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
});
