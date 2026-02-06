/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useDefaultAdHocDataViews } from './use_default_ad_hoc_data_views';
import { getDiscoverInternalStateMock } from '../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import React from 'react';
import { internalStateActions } from '../../application/main/state_management/redux';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { omit } from 'lodash';
import { DiscoverToolkitTestProvider } from '../../__mocks__/test_provider';

const existingAdHocDataVew = buildDataViewMock({ id: '1', title: 'test' });
const previousDataViews = [
  buildDataViewMock({ id: '2', title: 'tes2' }),
  buildDataViewMock({ id: '3', title: 'test3' }),
];
const newDataViews = [
  buildDataViewMock({ id: '4', title: 'test4' }),
  buildDataViewMock({ id: '5', title: 'test5' }),
];

const rootProfileState = {
  rootProfileLoading: false as const,
  AppWrapper: () => null,
  getDefaultAdHocDataViews: () =>
    newDataViews.map((dv) => {
      const { id, ...restSpec } = dv.toSpec();
      return { id: id!, ...restSpec };
    }),
};

const renderDefaultAdHocDataViewsHook = async () => {
  const services = createDiscoverServicesMock();
  const clearInstanceCache = jest.spyOn(services.dataViews, 'clearInstanceCache');
  const createDataView = jest
    .spyOn(services.dataViews, 'create')
    .mockImplementation((spec) => Promise.resolve(buildDataViewMock(omit(spec, 'fields'))));
  const toolkit = getDiscoverInternalStateMock({ services });

  await toolkit.initializeTabs();
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

  toolkit.internalState.dispatch(internalStateActions.appendAdHocDataViews(existingAdHocDataVew));
  toolkit.internalState.dispatch(
    internalStateActions.setDefaultProfileAdHocDataViews(previousDataViews)
  );

  const { result, unmount } = renderHook(useDefaultAdHocDataViews, {
    wrapper: ({ children }) => (
      <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
    ),
  });
  return {
    result,
    unmount,
    toolkit,
    clearInstanceCache,
    createDataView,
  };
};

describe('useDefaultAdHocDataViews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set default profile ad hoc data views', async () => {
    const { result, toolkit, clearInstanceCache, createDataView } =
      await renderDefaultAdHocDataViewsHook();
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(createDataView).not.toHaveBeenCalled();
    expect(toolkit.runtimeStateManager.adHocDataViews$.getValue()).toEqual([
      existingAdHocDataVew,
      ...previousDataViews,
    ]);
    expect(toolkit.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      previousDataViews.map((dv) => dv.id)
    );
    await result.current.initializeProfileDataViews(rootProfileState);
    expect(clearInstanceCache.mock.calls).toEqual(previousDataViews.map((dv) => [dv.id]));
    expect(createDataView.mock.calls).toEqual(
      newDataViews.map((dv) => [{ ...dv.toSpec(), managed: true }, true])
    );
    expect(toolkit.runtimeStateManager.adHocDataViews$.getValue().map((dv) => dv.id)).toEqual([
      existingAdHocDataVew.id,
      ...newDataViews.map((dv) => dv.id),
    ]);
    expect(toolkit.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      newDataViews.map((dv) => dv.id)
    );
  });

  it('should clear instance cache on unmount', async () => {
    const { unmount, toolkit, clearInstanceCache } = await renderDefaultAdHocDataViewsHook();
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(toolkit.runtimeStateManager.adHocDataViews$.getValue()).toEqual([
      existingAdHocDataVew,
      ...previousDataViews,
    ]);
    expect(toolkit.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      previousDataViews.map((dv) => dv.id)
    );
    unmount();
    expect(clearInstanceCache.mock.calls).toEqual(previousDataViews.map((s) => [s.id]));
    expect(toolkit.runtimeStateManager.adHocDataViews$.getValue()).toEqual([existingAdHocDataVew]);
    expect(toolkit.internalState.getState().defaultProfileAdHocDataViewIds).toEqual([]);
  });
});
