/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Storage } from '../../../kibana_utils/public';
import { DiscoverServices } from '../build_services';
import { LocalStorageMock } from '../__mocks__/local_storage_mock';
import { uiSettingsMock } from '../__mocks__/ui_settings';
import { useRowHeightsOptions } from './use_row_heights_options';
import { KibanaContextProvider } from '../../../kibana_react/public';

const CONFIG_ROW_HEIGHT = 3;

const getWrapper = (services: DiscoverServices) => {
  return ({ children }: { children: ReactNode }) => (
    <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
  );
};

describe('useRowHeightsOptions', () => {
  test('should apply rowHeight from savedSearch', () => {
    const { result } = renderHook(
      () => {
        return useRowHeightsOptions({
          rowHeightState: 2,
        });
      },
      {
        wrapper: getWrapper({
          uiSettings: uiSettingsMock,
          storage: new LocalStorageMock({}) as unknown as Storage,
        } as DiscoverServices),
      }
    );

    expect(result.current.defaultHeight).toEqual({ lineCount: 2 });
  });

  test('should apply rowHeight from local storage', () => {
    const { result } = renderHook(
      () => {
        return useRowHeightsOptions({});
      },
      {
        wrapper: getWrapper({
          uiSettings: uiSettingsMock,
          storage: new LocalStorageMock({
            ['discover:dataGridRowHeight']: {
              previousRowHeight: 5,
              previousConfigRowHeight: 3,
            },
          }) as unknown as Storage,
        } as DiscoverServices),
      }
    );

    expect(result.current.defaultHeight).toEqual({ lineCount: 5 });
  });

  test('should apply rowHeight from uiSettings', () => {
    const { result } = renderHook(
      () => {
        return useRowHeightsOptions({});
      },
      {
        wrapper: getWrapper({
          uiSettings: uiSettingsMock,
          storage: new LocalStorageMock({}) as unknown as Storage,
        } as unknown as DiscoverServices),
      }
    );

    expect(result.current.defaultHeight).toEqual({
      lineCount: CONFIG_ROW_HEIGHT,
    });
  });

  test('should apply rowHeight from uiSettings instead of local storage value, since uiSettings has been changed', () => {
    const { result } = renderHook(
      () => {
        return useRowHeightsOptions({});
      },
      {
        wrapper: getWrapper({
          uiSettings: uiSettingsMock,
          storage: new LocalStorageMock({
            ['discover:dataGridRowHeight']: {
              previousRowHeight: 4,
              // different from uiSettings (config), now user changed it to 3, but prev was 4
              previousConfigRowHeight: 4,
            },
          }) as unknown as Storage,
        } as unknown as DiscoverServices),
      }
    );

    expect(result.current.defaultHeight).toEqual({
      lineCount: CONFIG_ROW_HEIGHT,
    });
  });
});
