/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useDashboardContainer } from './use_dashboard_container';
import { renderHook, act } from '@testing-library/react-hooks';
import { KibanaContextProvider } from '../../../../kibana_react/public';
import React from 'react';
import { DashboardStateManager } from '../dashboard_state_manager';
import { getSavedDashboardMock } from '../test_helpers';
import { createKbnUrlStateStorage, defer } from '../../../../kibana_utils/public';
import { createBrowserHistory } from 'history';
import { dataPluginMock } from '../../../../data/public/mocks';
import { embeddablePluginMock } from '../../../../embeddable/public/mocks';
import { DashboardCapabilities } from '../types';
import { EmbeddableFactory } from '../../../../embeddable/public';
import { DashboardContainer } from '../embeddable';
import { HelloWorldEmbeddable } from '../../../../../../examples/embeddable_examples/public';

const savedDashboard = getSavedDashboardMock();

// TS is *very* picky with type guards / predicates. can't just use jest.fn()
function mockHasTaggingCapabilities(obj: any): obj is any {
  return false;
}

const history = createBrowserHistory();
const createDashboardState = () =>
  new DashboardStateManager({
    savedDashboard,
    hideWriteControls: false,
    kibanaVersion: '7.0.0',
    kbnUrlStateStorage: createKbnUrlStateStorage(),
    history: createBrowserHistory(),
    hasTaggingCapabilities: mockHasTaggingCapabilities,
  });

const defaultCapabilities: DashboardCapabilities = {
  show: false,
  createNew: false,
  saveQuery: false,
  createShortUrl: false,
  hideWriteControls: true,
  mapsCapabilities: { save: false },
  visualizeCapabilities: { save: false },
};

const services = {
  dashboardCapabilities: defaultCapabilities,
  data: dataPluginMock.createStartContract(),
  embeddable: embeddablePluginMock.createStartContract(),
  scopedHistory: history,
};

const setupEmbeddableFactory = () => {
  const embeddable = new HelloWorldEmbeddable({ id: 'id' });
  const deferEmbeddableCreate = defer();
  services.embeddable.getEmbeddableFactory.mockImplementation(
    () =>
      (({
        create: () => deferEmbeddableCreate.promise,
      } as unknown) as EmbeddableFactory)
  );
  const destroySpy = jest.spyOn(embeddable, 'destroy');

  return {
    destroySpy,
    embeddable,
    createEmbeddable: () => {
      act(() => {
        deferEmbeddableCreate.resolve(embeddable);
      });
    },
  };
};

test('container is destroyed on unmount', async () => {
  const { createEmbeddable, destroySpy, embeddable } = setupEmbeddableFactory();

  const state = createDashboardState();
  const { result, unmount, waitForNextUpdate } = renderHook(
    () => useDashboardContainer(state, history, false),
    {
      wrapper: ({ children }) => (
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      ),
    }
  );

  expect(result.current).toBeNull(); // null on initial render

  createEmbeddable();

  await waitForNextUpdate();

  expect(embeddable).toBe(result.current);
  expect(destroySpy).not.toBeCalled();

  unmount();

  expect(destroySpy).toBeCalled();
});

test('old container is destroyed on new dashboardStateManager', async () => {
  const embeddableFactoryOld = setupEmbeddableFactory();

  const { result, waitForNextUpdate, rerender } = renderHook<
    DashboardStateManager,
    DashboardContainer | null
  >((dashboardState) => useDashboardContainer(dashboardState, history, false), {
    wrapper: ({ children }) => (
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    ),
    initialProps: createDashboardState(),
  });

  expect(result.current).toBeNull(); // null on initial render

  embeddableFactoryOld.createEmbeddable();

  await waitForNextUpdate();

  expect(embeddableFactoryOld.embeddable).toBe(result.current);
  expect(embeddableFactoryOld.destroySpy).not.toBeCalled();

  const embeddableFactoryNew = setupEmbeddableFactory();
  rerender(createDashboardState());

  embeddableFactoryNew.createEmbeddable();

  await waitForNextUpdate();

  expect(embeddableFactoryNew.embeddable).toBe(result.current);

  expect(embeddableFactoryNew.destroySpy).not.toBeCalled();
  expect(embeddableFactoryOld.destroySpy).toBeCalled();
});

test('destroyed if rerendered before resolved', async () => {
  const embeddableFactoryOld = setupEmbeddableFactory();

  const { result, waitForNextUpdate, rerender } = renderHook<
    DashboardStateManager,
    DashboardContainer | null
  >((dashboardState) => useDashboardContainer(dashboardState, history, false), {
    wrapper: ({ children }) => (
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    ),
    initialProps: createDashboardState(),
  });

  expect(result.current).toBeNull(); // null on initial render

  const embeddableFactoryNew = setupEmbeddableFactory();
  rerender(createDashboardState());
  embeddableFactoryNew.createEmbeddable();
  await waitForNextUpdate();
  expect(embeddableFactoryNew.embeddable).toBe(result.current);
  expect(embeddableFactoryNew.destroySpy).not.toBeCalled();

  embeddableFactoryOld.createEmbeddable();

  await act(() => Promise.resolve()); // Can't use waitFor from hooks, because there is no hook update
  expect(embeddableFactoryNew.embeddable).toBe(result.current);
  expect(embeddableFactoryNew.destroySpy).not.toBeCalled();
  expect(embeddableFactoryOld.destroySpy).toBeCalled();
});
