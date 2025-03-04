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
import { DataView } from '@kbn/data-views-plugin/common';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const renderDefaultAdHocDataViewsHook = ({
  rootProfileLoading,
}: {
  rootProfileLoading: boolean;
}) => {
  const clearInstanceCache = jest.spyOn(discoverServiceMock.dataViews, 'clearInstanceCache');
  const createDataView = jest
    .spyOn(discoverServiceMock.dataViews, 'create')
    .mockImplementation((spec) => Promise.resolve(spec as unknown as DataView));
  const existingAdHocDataVew = { id: '1', title: 'test' } as unknown as DataView;
  const previousSpecs = [
    { id: '2', title: 'tes2' },
    { id: '3', title: 'test3' },
  ];
  const newSpecs = [
    { id: '4', title: 'test4' },
    { id: '5', title: 'test5' },
  ];
  const stateContainer = getDiscoverStateMock({});
  stateContainer.internalState.transitions.appendAdHocDataViews(existingAdHocDataVew);
  stateContainer.internalState.transitions.setDefaultProfileAdHocDataViews(
    previousSpecs as unknown as DataView[]
  );
  const { result, unmount } = renderHook(useDefaultAdHocDataViews, {
    initialProps: {
      stateContainer,
      rootProfileState: {
        rootProfileLoading,
        AppWrapper: () => null,
        getDefaultAdHocDataViews: () => newSpecs,
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
    previousSpecs,
    newSpecs,
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
      previousSpecs,
      newSpecs,
    } = renderDefaultAdHocDataViewsHook({ rootProfileLoading: false });
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(createDataView).not.toHaveBeenCalled();
    expect(stateContainer.internalState.get().adHocDataViews).toEqual([
      existingAdHocDataVew,
      ...previousSpecs,
    ]);
    expect(stateContainer.internalState.get().defaultProfileAdHocDataViewIds).toEqual(
      previousSpecs.map((s) => s.id)
    );
    await result.current.initializeProfileDataViews();
    expect(clearInstanceCache.mock.calls).toEqual(previousSpecs.map((s) => [s.id]));
    expect(createDataView.mock.calls).toEqual(newSpecs.map((s) => [s, true]));
    expect(stateContainer.internalState.get().adHocDataViews).toEqual([
      existingAdHocDataVew,
      ...newSpecs,
    ]);
    expect(stateContainer.internalState.get().defaultProfileAdHocDataViewIds).toEqual(
      newSpecs.map((s) => s.id)
    );
  });

  it('should not set default profile ad hoc data views when root profile is loading', async () => {
    const {
      result,
      clearInstanceCache,
      createDataView,
      stateContainer,
      existingAdHocDataVew,
      previousSpecs,
    } = renderDefaultAdHocDataViewsHook({ rootProfileLoading: true });
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(createDataView).not.toHaveBeenCalled();
    expect(stateContainer.internalState.get().adHocDataViews).toEqual([
      existingAdHocDataVew,
      ...previousSpecs,
    ]);
    expect(stateContainer.internalState.get().defaultProfileAdHocDataViewIds).toEqual(
      previousSpecs.map((s) => s.id)
    );
    await result.current.initializeProfileDataViews();
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(createDataView).not.toHaveBeenCalled();
    expect(stateContainer.internalState.get().adHocDataViews).toEqual([
      existingAdHocDataVew,
      ...previousSpecs,
    ]);
    expect(stateContainer.internalState.get().defaultProfileAdHocDataViewIds).toEqual(
      previousSpecs.map((s) => s.id)
    );
  });

  it('should clear instance cache on unmount', async () => {
    const { unmount, clearInstanceCache, stateContainer, existingAdHocDataVew, previousSpecs } =
      renderDefaultAdHocDataViewsHook({ rootProfileLoading: false });
    expect(clearInstanceCache).not.toHaveBeenCalled();
    expect(stateContainer.internalState.get().adHocDataViews).toEqual([
      existingAdHocDataVew,
      ...previousSpecs,
    ]);
    expect(stateContainer.internalState.get().defaultProfileAdHocDataViewIds).toEqual(
      previousSpecs.map((s) => s.id)
    );
    unmount();
    expect(clearInstanceCache.mock.calls).toEqual(previousSpecs.map((s) => [s.id]));
    expect(stateContainer.internalState.get().adHocDataViews).toEqual([existingAdHocDataVew]);
    expect(stateContainer.internalState.get().defaultProfileAdHocDataViewIds).toEqual([]);
  });
});
