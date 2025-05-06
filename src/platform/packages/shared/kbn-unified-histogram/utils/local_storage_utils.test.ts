/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  CHART_HIDDEN_KEY,
  getBreakdownField,
  getChartHidden,
  getTopPanelHeight,
  HISTOGRAM_BREAKDOWN_FIELD_KEY,
  HISTOGRAM_HEIGHT_KEY,
  setBreakdownField,
  setChartHidden,
  setTopPanelHeight,
} from './local_storage_utils';

describe('local storage utils', () => {
  const localStorageKeyPrefix = 'testPrefix';
  const mockStorage = {
    get: jest.fn((key: string) => {
      switch (key) {
        case `${localStorageKeyPrefix}:${CHART_HIDDEN_KEY}`:
          return true;
        case `${localStorageKeyPrefix}:${HISTOGRAM_HEIGHT_KEY}`:
          return 100;
        case `${localStorageKeyPrefix}:${HISTOGRAM_BREAKDOWN_FIELD_KEY}`:
          return 'testField';
        default:
          return undefined;
      }
    }),
    set: jest.fn(),
  };
  const storage = mockStorage as unknown as Storage;

  it('should execute get functions correctly', () => {
    expect(getChartHidden(storage, localStorageKeyPrefix)).toEqual(true);
    expect(mockStorage.get).toHaveBeenLastCalledWith(
      `${localStorageKeyPrefix}:${CHART_HIDDEN_KEY}`
    );
    expect(getTopPanelHeight(storage, localStorageKeyPrefix)).toEqual(100);
    expect(mockStorage.get).toHaveBeenLastCalledWith(
      `${localStorageKeyPrefix}:${HISTOGRAM_HEIGHT_KEY}`
    );
    expect(getBreakdownField(storage, localStorageKeyPrefix)).toEqual('testField');
    expect(mockStorage.get).toHaveBeenLastCalledWith(
      `${localStorageKeyPrefix}:${HISTOGRAM_BREAKDOWN_FIELD_KEY}`
    );
  });

  it('should execute set functions correctly', () => {
    setChartHidden(storage, localStorageKeyPrefix, false);
    expect(mockStorage.set).toHaveBeenLastCalledWith(
      `${localStorageKeyPrefix}:${CHART_HIDDEN_KEY}`,
      false
    );
    setTopPanelHeight(storage, localStorageKeyPrefix, 200);
    expect(mockStorage.set).toHaveBeenLastCalledWith(
      `${localStorageKeyPrefix}:${HISTOGRAM_HEIGHT_KEY}`,
      200
    );
    setBreakdownField(storage, localStorageKeyPrefix, 'testField2');
    expect(mockStorage.set).toHaveBeenLastCalledWith(
      `${localStorageKeyPrefix}:${HISTOGRAM_BREAKDOWN_FIELD_KEY}`,
      'testField2'
    );
  });
});
