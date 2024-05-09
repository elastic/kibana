/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { UnifiedHistogramFetchStatus } from '../..';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import { lensAdaptersMock } from '../../__mocks__/lens_adapters';
import {
  getChartHidden,
  getTopPanelHeight,
  getBreakdownField,
  setChartHidden,
  setTopPanelHeight,
  setBreakdownField,
} from '../utils/local_storage_utils';
import { createStateService, UnifiedHistogramState } from './state_service';

jest.mock('../utils/local_storage_utils', () => {
  const originalModule = jest.requireActual('../utils/local_storage_utils');
  return {
    ...originalModule,
    getChartHidden: jest.fn(originalModule.getChartHidden),
    getTopPanelHeight: jest.fn(originalModule.getTopPanelHeight),
    getBreakdownField: jest.fn(originalModule.getBreakdownField),
    setChartHidden: jest.fn(originalModule.setChartHidden),
    setTopPanelHeight: jest.fn(originalModule.setTopPanelHeight),
    setBreakdownField: jest.fn(originalModule.setBreakdownField),
  };
});

describe('UnifiedHistogramStateService', () => {
  beforeEach(() => {
    (getChartHidden as jest.Mock).mockClear();
    (getTopPanelHeight as jest.Mock).mockClear();
    (getBreakdownField as jest.Mock).mockClear();
    (setChartHidden as jest.Mock).mockClear();
    (setTopPanelHeight as jest.Mock).mockClear();
    (setBreakdownField as jest.Mock).mockClear();
  });

  const initialState: UnifiedHistogramState = {
    breakdownField: 'bytes',
    chartHidden: false,
    lensRequestAdapter: new RequestAdapter(),
    lensAdapters: lensAdaptersMock,
    timeInterval: 'auto',
    topPanelHeight: 100,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    totalHitsResult: undefined,
    currentSuggestionContext: undefined,
  };

  it('should initialize state with default values', () => {
    const stateService = createStateService({ services: unifiedHistogramServicesMock });
    let state: UnifiedHistogramState | undefined;
    stateService.state$.subscribe((s) => (state = s));
    expect(state).toEqual({
      breakdownField: undefined,
      chartHidden: false,
      lensRequestAdapter: undefined,
      timeInterval: 'auto',
      topPanelHeight: undefined,
      totalHitsResult: undefined,
      totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
      currentSuggestionContext: undefined,
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
    expect(getChartHidden as jest.Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix
    );
    expect(getTopPanelHeight as jest.Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix
    );
    expect(getBreakdownField as jest.Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix
    );
  });

  it('should not get values from storage if localStorageKeyPrefix is not provided', () => {
    createStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    expect(getChartHidden as jest.Mock).not.toHaveBeenCalled();
    expect(getTopPanelHeight as jest.Mock).not.toHaveBeenCalled();
    expect(getBreakdownField as jest.Mock).not.toHaveBeenCalled();
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
    stateService.setBreakdownField('test');
    newState = { ...newState, breakdownField: 'test' };
    expect(state).toEqual(newState);
    stateService.setTimeInterval('test');
    newState = { ...newState, timeInterval: 'test' };
    expect(state).toEqual(newState);
    stateService.setLensRequestAdapter(undefined);
    newState = { ...newState, lensRequestAdapter: undefined };
    stateService.setLensAdapters(undefined);
    newState = { ...newState, lensAdapters: undefined };
    expect(state).toEqual(newState);
    stateService.setLensEmbeddableOutput$(undefined);
    newState = { ...newState, lensEmbeddableOutput$: undefined };
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
    stateService.setBreakdownField('test');
    expect(state).toEqual({
      ...initialState,
      chartHidden: true,
      topPanelHeight: 200,
      breakdownField: 'test',
    });
    expect(setChartHidden as jest.Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix,
      true
    );
    expect(setTopPanelHeight as jest.Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix,
      200
    );
    expect(setBreakdownField as jest.Mock).toHaveBeenCalledWith(
      unifiedHistogramServicesMock.storage,
      localStorageKeyPrefix,
      'test'
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
    stateService.setBreakdownField('test');
    expect(state).toEqual({
      ...initialState,
      chartHidden: true,
      topPanelHeight: 200,
      breakdownField: 'test',
    });
    expect(setChartHidden as jest.Mock).not.toHaveBeenCalled();
    expect(setTopPanelHeight as jest.Mock).not.toHaveBeenCalled();
    expect(setBreakdownField as jest.Mock).not.toHaveBeenCalled();
  });
});
