/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { UnifiedHistogramFetchStatus } from '../..';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import {
  getChartHidden,
  getTopPanelHeight,
  getBreakdownField,
  setChartHidden,
  setTopPanelHeight,
  setBreakdownField,
} from '../utils/local_storage_utils';
import { UnifiedHistogramState, UnifiedHistogramStateService } from './state_service';

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
    dataView: dataViewWithTimefieldMock,
    filters: [],
    lensRequestAdapter: new RequestAdapter(),
    query: { language: 'kuery', query: '' },
    requestAdapter: new RequestAdapter(),
    searchSessionId: '123',
    timeInterval: 'auto',
    timeRange: { from: 'now-15m', to: 'now' },
    topPanelHeight: 100,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    totalHitsResult: undefined,
  };

  it('should initialize state with default values', () => {
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      initialState: {
        dataView: dataViewWithTimefieldMock,
      },
    });
    let state: UnifiedHistogramState | undefined;
    stateService.getState$().subscribe((s) => (state = s));
    expect(state).toEqual({
      breakdownField: undefined,
      chartHidden: false,
      dataView: dataViewWithTimefieldMock,
      filters: [],
      lensRequestAdapter: undefined,
      query: unifiedHistogramServicesMock.data.query.queryString.getDefaultQuery(),
      requestAdapter: undefined,
      searchSessionId: undefined,
      timeInterval: 'auto',
      timeRange: unifiedHistogramServicesMock.data.query.timefilter.timefilter.getTimeDefaults(),
      topPanelHeight: undefined,
      totalHitsResult: undefined,
      totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    });
  });

  it('should initialize state with initial values', () => {
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.getState$().subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
  });

  it('should get values from storage if localStorageKeyPrefix is provided', () => {
    const localStorageKeyPrefix = 'test';
    new UnifiedHistogramStateService({
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
    new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    expect(getChartHidden as jest.Mock).not.toHaveBeenCalled();
    expect(getTopPanelHeight as jest.Mock).not.toHaveBeenCalled();
    expect(getBreakdownField as jest.Mock).not.toHaveBeenCalled();
  });

  it('should update state', () => {
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.getState$().subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
    stateService.updateState({ chartHidden: true });
    expect(state).toEqual({ ...initialState, chartHidden: true });
  });

  it('should only trigger the getState$ observable if the state has changed', () => {
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    const fn = jest.fn();
    stateService.getState$().subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    stateService.updateState({ chartHidden: false });
    expect(fn).toHaveBeenCalledTimes(1);
    stateService.updateState({ chartHidden: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should accept a selector function to getState$', () => {
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    const fn = jest.fn();
    stateService.getState$((state) => state.chartHidden).subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(false);
    stateService.updateState({ breakdownField: 'bytes' });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(false);
    stateService.updateState({ chartHidden: true });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(true);
  });

  it('should update state and save it to storage if localStorageKeyPrefix is provided', () => {
    const localStorageKeyPrefix = 'test';
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      localStorageKeyPrefix,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.getState$().subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
    stateService.updateState({ chartHidden: true, topPanelHeight: 200, breakdownField: 'bytes' });
    expect(state).toEqual({
      ...initialState,
      chartHidden: true,
      topPanelHeight: 200,
      breakdownField: 'bytes',
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
      'bytes'
    );
  });

  it("should not save state to storage if keys don't exist in update object", () => {
    const localStorageKeyPrefix = 'test';
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      localStorageKeyPrefix,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.getState$().subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
    stateService.updateState({ searchSessionId: '321' });
    expect(state).toEqual({ ...initialState, searchSessionId: '321' });
    expect(setChartHidden as jest.Mock).not.toHaveBeenCalled();
    expect(setTopPanelHeight as jest.Mock).not.toHaveBeenCalled();
    expect(setBreakdownField as jest.Mock).not.toHaveBeenCalled();
  });

  it('should not save state to storage if localStorageKeyPrefix is not provided', () => {
    const stateService = new UnifiedHistogramStateService({
      services: unifiedHistogramServicesMock,
      initialState,
    });
    let state: UnifiedHistogramState | undefined;
    stateService.getState$().subscribe((s) => (state = s));
    expect(state).toEqual(initialState);
    stateService.updateState({ chartHidden: true, topPanelHeight: 200, breakdownField: 'bytes' });
    expect(state).toEqual({
      ...initialState,
      chartHidden: true,
      topPanelHeight: 200,
      breakdownField: 'bytes',
    });
    expect(setChartHidden as jest.Mock).not.toHaveBeenCalled();
    expect(setTopPanelHeight as jest.Mock).not.toHaveBeenCalled();
    expect(setBreakdownField as jest.Mock).not.toHaveBeenCalled();
  });
});
