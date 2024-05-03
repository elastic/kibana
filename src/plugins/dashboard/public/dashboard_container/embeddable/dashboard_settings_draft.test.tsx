/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  useDashboardSettingsDraft,
  dashboardDraftSettings$,
  type DashboardSettings,
} from './dashboard_settings_draft';

describe('useDashboardSettingsDraft', () => {
  const mockDashboardSettings = {
    query: {
      query: 'from some_data_view | limit:10',
      language: 'esql',
    },
    timeRestore: false,
    filters: [
      {
        meta: {},
      },
    ],
  } as unknown as DashboardSettings;

  test('returns a tuple of value and setter', () => {
    const { result } = renderHook(() => useDashboardSettingsDraft(mockDashboardSettings));

    expect(result.current[0]).toBe(mockDashboardSettings);
    expect(result.current[1]).toStrictEqual(expect.any(Function));
  });

  test('updates propagated with tuple setter reflects in returned value and exposed observable', () => {
    const { result } = renderHook(() => useDashboardSettingsDraft(mockDashboardSettings));

    expect(result.current[0]).toBe(mockDashboardSettings);

    const mockSubscriber = jest.fn();

    dashboardDraftSettings$.subscribe(mockSubscriber);

    act(() => {
      result.current[1]((prev) => ({
        ...prev,
        query: {
          query: '',
          language: 'kql',
        },
      }));
    });

    expect(result.current[0]).not.toBe(mockDashboardSettings);

    const differentiatedSettings = expect.objectContaining({
      query: {
        query: '',
        language: 'kql',
      },
    });

    expect(result.current[0]).toEqual(differentiatedSettings);
    expect(mockSubscriber).toHaveBeenCalledWith(differentiatedSettings);
  });
});
