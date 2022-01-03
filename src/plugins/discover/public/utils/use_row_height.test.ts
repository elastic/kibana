/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { Storage } from '../../../kibana_utils/public';
import { ROW_HEIGHT_OPTION } from '../../common';
import { DiscoverServices } from '../build_services';
import { setServices } from '../kibana_services';
import { useRowHeight } from './use_row_height';

const CONFIG_ROW_HEIGHT = 3;

class LocalStorageMock {
  private store: Record<string, unknown>;
  constructor(defaultStore: Record<string, unknown>) {
    this.store = defaultStore;
  }
  clear() {
    this.store = {};
  }
  get(key: string) {
    return this.store[key] || null;
  }
  set(key: string, value: unknown) {
    this.store[key] = String(value);
  }
  remove(key: string) {
    delete this.store[key];
  }
}

describe('useRowHeight', () => {
  beforeEach(() => {
    setServices({
      uiSettings: {
        get: (key: string) => {
          if (key === ROW_HEIGHT_OPTION) {
            return 3;
          }
        },
      },
    } as unknown as DiscoverServices);
  });

  test('should apply rowHeight from savedSearch', () => {
    const { result } = renderHook(() => {
      return useRowHeight({
        storage: new LocalStorageMock({}) as unknown as Storage,
        savedSearchRowHeight: 2,
      });
    });

    expect(result.current.defaultRowHeight).toEqual({ lineCount: 2 });
  });

  test('should apply rowHeight from local storage', () => {
    const { result } = renderHook(() => {
      return useRowHeight({
        storage: new LocalStorageMock({
          ['discover:rowHeight']: {
            previousUsed: 5,
            prevConfigRowHeight: CONFIG_ROW_HEIGHT,
          },
        }) as unknown as Storage,
      });
    });

    expect(result.current.defaultRowHeight).toEqual({ lineCount: 5 });
  });

  test('should apply rowHeight from uiSettings', () => {
    const { result } = renderHook(() => {
      return useRowHeight({
        storage: new LocalStorageMock({}) as unknown as Storage,
      });
    });

    expect(result.current.defaultRowHeight).toEqual({ lineCount: CONFIG_ROW_HEIGHT });
  });

  test('should apply rowHeight from uiSettings instead of local storage value, since uiSettings has been changed', () => {
    const { result } = renderHook(() => {
      return useRowHeight({
        storage: new LocalStorageMock({
          ['discover:rowHeight']: {
            previousUsed: 4,
            // different from uiSettings (config), now user changed it to 3, but prev was 4
            prevConfigRowHeight: 4,
          },
        }) as unknown as Storage,
      });
    });

    expect(result.current.defaultRowHeight).toEqual({ lineCount: CONFIG_ROW_HEIGHT });
  });
});
