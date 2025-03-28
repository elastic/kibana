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
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import { discoverServiceMock } from '../../__mocks__/services';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { internalStateActions } from '../../application/main/state_management/redux';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { omit } from 'lodash';

const renderDefaultAdHocDataViewsHook = ({
  rootProfileLoading,
}: {
  rootProfileLoading: boolean;
}) => {
  const clearInstanceCache = jest.spyOn(discoverServiceMock.dataViews, 'clearInstanceCache');
  const createDataView = jest
    .spyOn(discoverServiceMock.dataViews, 'create')
    .mockImplementation((spec) => Promise.resolve(buildDataViewMock(omit(spec, 'fields'))));
  const existingAdHocDataVew = buildDataViewMock({ id: '1', title: 'test' });
  const previousDataViews = [
    buildDataViewMock({ id: '2', title: 'tes2' }),
    buildDataViewMock({ id: '3', title: 'test3' }),
  ];
  const newDataViews = [
    buildDataViewMock({ id: '4', title: 'test4' }),
    buildDataViewMock({ id: '5', title: 'test5' }),
  ];
  const stateContainer = getDiscoverStateMock({});
  stateContainer.internalState.dispatch(
    internalStateActions.appendAdHocDataViews(existingAdHocDataVew)
  );
  stateContainer.internalState.dispatch(
    internalStateActions.setDefaultProfileAdHocDataViews(previousDataViews)
  );
  const { result, unmount } = renderHook(useDefaultAdHocDataViews, {
    initialProps: {
      stateContainer,
      rootProfileState: {
        rootProfileLoading,
        AppWrapper: () => <></>,
        getDefaultAdHocDataViews: () =>
          newDataViews.map((dv) => {
            const { id, ...restSpec } = dv.toSpec();
            return { id: id!, ...restSpec };
          }),
      },
    },
    wrapper: ({ children }) => (
      <KibanaContextProvider services={discoverServiceMock}>{children}</KibanaContextProvider>
    ),
  });
  return {
    result,
    unmount,
    clearInstanceCache,
    createDataView,
    stateContainer,
    existingAdHocDataVew,
    previousDataViews,
    newDataViews,
  };
};

describe('useDefaultAdHocDataViews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set default profile ad hoc data views', async () => {
    const {
      result,
      clearInstanceCache,
      createDataView,
      stateContainer,
      existingAdHocDataVew,
      previousDataViews,
      newDataViews,
    } = renderDefaultAdHocDataViewsHook({ rootProfileLoading: false });
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(createDataView).not.toHaveBeenCalled();
    expect(stateContainer.runtimeStateManager.adHocDataViews$.getValue()).toEqual([
      existingAdHocDataVew,
      ...previousDataViews,
    ]);
    expect(stateContainer.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      previousDataViews.map((dv) => dv.id)
    );
    await result.current.initializeProfileDataViews();
    expect(clearInstanceCache.mock.calls).toEqual(previousDataViews.map((dv) => [dv.id]));
    expect(createDataView.mock.calls).toEqual(newDataViews.map((dv) => [dv.toSpec(), true]));
    expect(
      stateContainer.runtimeStateManager.adHocDataViews$.getValue().map((dv) => dv.id)
    ).toEqual([existingAdHocDataVew.id, ...newDataViews.map((dv) => dv.id)]);
    expect(stateContainer.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      newDataViews.map((dv) => dv.id)
    );
  });

  it('should not set default profile ad hoc data views when root profile is loading', async () => {
    const {
      result,
      clearInstanceCache,
      createDataView,
      stateContainer,
      existingAdHocDataVew,
      previousDataViews,
    } = renderDefaultAdHocDataViewsHook({ rootProfileLoading: true });
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(createDataView).not.toHaveBeenCalled();
    expect(stateContainer.runtimeStateManager.adHocDataViews$.getValue()).toEqual([
      existingAdHocDataVew,
      ...previousDataViews,
    ]);
    expect(stateContainer.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      previousDataViews.map((dv) => dv.id)
    );
    await result.current.initializeProfileDataViews();
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(createDataView).not.toHaveBeenCalled();
    expect(stateContainer.runtimeStateManager.adHocDataViews$.getValue()).toEqual([
      existingAdHocDataVew,
      ...previousDataViews,
    ]);
    expect(stateContainer.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      previousDataViews.map((dv) => dv.id)
    );
  });

  it('should clear instance cache on unmount', async () => {
    const { unmount, clearInstanceCache, stateContainer, existingAdHocDataVew, previousDataViews } =
      renderDefaultAdHocDataViewsHook({ rootProfileLoading: false });
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(stateContainer.runtimeStateManager.adHocDataViews$.getValue()).toEqual([
      existingAdHocDataVew,
      ...previousDataViews,
    ]);
    expect(stateContainer.internalState.getState().defaultProfileAdHocDataViewIds).toEqual(
      previousDataViews.map((dv) => dv.id)
    );
    unmount();
    expect(clearInstanceCache.mock.calls).toEqual(previousDataViews.map((s) => [s.id]));
    expect(stateContainer.runtimeStateManager.adHocDataViews$.getValue()).toEqual([
      existingAdHocDataVew,
    ]);
    expect(stateContainer.internalState.getState().defaultProfileAdHocDataViewIds).toEqual([]);
  });
});
