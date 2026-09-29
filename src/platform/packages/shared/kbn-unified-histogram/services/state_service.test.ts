/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import {
  getChartHidden,
  getTopPanelHeight,
  setChartHidden,
  setTopPanelHeight,
} from '@kbn/discover-utils';
import { UnifiedHistogramFetchStatus } from '..';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { lensAdaptersMock } from '../__mocks__/lens_adapters';
import type { UnifiedHistogramState } from './state_service';
import { createStateService } from './state_service';

vi.mock('@kbn/discover-utils', () => {
      const mocked = {
      getChartHidden: vi.fn(),
      getTopPanelHeight: vi.fn(),
      setChartHidden: vi.fn(),
      setTopPanelHeight: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('UnifiedHistogramStateService', () => {
  beforeEach(() => {
    (getChartHidden as Mock).mockClear();
    (getTopPanelHeight as Mock).mockClear();
    (setChartHidden as Mock).mockClear();
    (setTopPanelHeight as Mock).mockClear();
  });

  const initialState: UnifiedHistogramState = {
    chartHidden: false,
    lensRequestAdapter: new RequestAdapter(),
    lensAdapters: lensAdaptersMock,
    topPanelHeight: 100,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    totalHitsResult: undefined,
  };

  it('should initialize state with default values', () => {
    const stateService = createStateService({ services: unifiedHistogramServicesMock });
    let state: UnifiedHistogramState | undefined;
    stateService.state$.subscribe((s) => (state = s));
    expect(state).toEqual({
      chartHidden: false,
      lensRequestAdapter: undefined,
      topPanelHeight: undefined,
      totalHitsResult: undefined,
      totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    });
  });

  it('should initialize state with initial values', () => {
    const stateService = createStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.state$.subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
  });

  it('should get values from storage if localStorageKeyPrefix is provided', () => {
    const localStorageKeyPrefix = 'test';
    createStateService({
      services: unifiedHistogramServicesMock,
      localStorageKeyPrefix,
      initialState,
    });
    expect(getChartHidden as Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix
    );
    expect(getTopPanelHeight as Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix
    );
  });

  it('should not get values from storage if localStorageKeyPrefix is not provided', () => {
    createStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    expect(getChartHidden as Mock).not.toHaveBeenCalled();
    expect(getTopPanelHeight as Mock).not.toHaveBeenCalled();
  });

  it('should update state', () => {
    const stateService = createStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    let newState = initialState;
    stateService.state$.subscribe((s) => (state = s));
    expect(state).toEqual(newState);
    stateService.setChartHidden(true);
    newState = { ...newState, chartHidden: true };
    expect(state).toEqual(newState);
    stateService.setTopPanelHeight(200);
    newState = { ...newState, topPanelHeight: 200 };
    expect(state).toEqual(newState);
    stateService.setLensRequestAdapter(undefined);
    newState = { ...newState, lensRequestAdapter: undefined };
    stateService.setLensAdapters(undefined);
    newState = { ...newState, lensAdapters: undefined };
    expect(state).toEqual(newState);
    stateService.setLensDataLoading$(undefined);
    newState = { ...newState, dataLoading$: undefined };
    expect(state).toEqual(newState);
    stateService.setTotalHits({
      totalHitsStatus: UnifiedHistogramFetchStatus.complete,
      totalHitsResult: 100,
    });
    newState = {
      ...newState,
      totalHitsStatus: UnifiedHistogramFetchStatus.complete,
      totalHitsResult: 100,
    };
    expect(state).toEqual(newState);
  });

  it('should update state and save it to storage if localStorageKeyPrefix is provided', () => {
    const localStorageKeyPrefix = 'test';
    const stateService = createStateService({
      services: unifiedHistogramServicesMock,
      localStorageKeyPrefix,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.state$.subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
    stateService.setChartHidden(true);
    stateService.setTopPanelHeight(200);
    expect(state).toEqual({
      ...initialState,
      chartHidden: true,
      topPanelHeight: 200,
    });
    expect(setTopPanelHeight as Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix,
      200
    );
  });

  it('should not save state to storage if localStorageKeyPrefix is not provided', () => {
    const stateService = createStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.state$.subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
    stateService.setChartHidden(true);
    stateService.setTopPanelHeight(200);
    expect(state).toEqual({
      ...initialState,
      chartHidden: true,
      topPanelHeight: 200,
    });
    expect(setChartHidden as Mock).not.toHaveBeenCalled();
    expect(setTopPanelHeight as Mock).not.toHaveBeenCalled();
  });
});
