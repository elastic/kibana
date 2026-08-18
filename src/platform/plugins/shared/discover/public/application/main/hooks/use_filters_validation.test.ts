/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { Filter } from '@kbn/es-query';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { IndexPatternSource } from '@kbn/data-source';
import { useFiltersValidation } from './use_filters_validation';
import { dataViewAdHoc } from '../../../__mocks__/data_view_complex';
import { createDiscoverServicesMock } from '../../../__mocks__/services';

const dataSourceAdHoc = new IndexPatternSource(dataViewAdHoc);
const dataSourcePersisted = new IndexPatternSource(dataViewMock);

describe('useFiltersValidation', () => {
  let filterUpdates$: Subject<void>;
  let services: ReturnType<typeof createDiscoverServicesMock>;

  beforeEach(() => {
    jest.useFakeTimers();
    filterUpdates$ = new Subject<void>();
    services = createDiscoverServicesMock();
    jest.spyOn(services.filterManager, 'getUpdates$').mockReturnValue(filterUpdates$);
    jest.spyOn(services.filterManager, 'getFilters').mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show warning when ad-hoc data view has mismatched filter index', () => {
    const filters: Filter[] = [{ meta: { index: 'different-id' } } as Filter];
    jest.spyOn(services.filterManager, 'getFilters').mockReturnValue(filters);

    renderHook(() =>
      useFiltersValidation({
        dataSource: dataSourceAdHoc,
        filterManager: services.filterManager,
        toastNotifications: services.toastNotifications,
      })
    );

    filterUpdates$.next();
    jest.advanceTimersByTime(500);

    expect(services.toastNotifications.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'invalidFiltersWarnToast',
      })
    );
  });

  it('should not show warning when data view is persisted', () => {
    const filters: Filter[] = [{ meta: { index: 'different-id' } } as Filter];
    jest.spyOn(services.filterManager, 'getFilters').mockReturnValue(filters);

    renderHook(() =>
      useFiltersValidation({
        dataSource: dataSourcePersisted,
        filterManager: services.filterManager,
        toastNotifications: services.toastNotifications,
      })
    );

    filterUpdates$.next();
    jest.advanceTimersByTime(500);

    expect(services.toastNotifications.addWarning).not.toHaveBeenCalled();
  });

  it('should not show warning when all filter indices match data view id', () => {
    const filters: Filter[] = [{ meta: { index: dataViewAdHoc.id } } as Filter];
    jest.spyOn(services.filterManager, 'getFilters').mockReturnValue(filters);

    renderHook(() =>
      useFiltersValidation({
        dataSource: dataSourceAdHoc,
        filterManager: services.filterManager,
        toastNotifications: services.toastNotifications,
      })
    );

    filterUpdates$.next();
    jest.advanceTimersByTime(500);

    expect(services.toastNotifications.addWarning).not.toHaveBeenCalled();
  });

  it('should not show warning when no filters exist', () => {
    renderHook(() =>
      useFiltersValidation({
        dataSource: dataSourceAdHoc,
        filterManager: services.filterManager,
        toastNotifications: services.toastNotifications,
      })
    );

    filterUpdates$.next();
    jest.advanceTimersByTime(500);

    expect(services.toastNotifications.addWarning).not.toHaveBeenCalled();
  });

  it('should unsubscribe on unmount', () => {
    const filters: Filter[] = [{ meta: { index: 'different-id' } } as Filter];
    jest.spyOn(services.filterManager, 'getFilters').mockReturnValue(filters);

    const { unmount } = renderHook(() =>
      useFiltersValidation({
        dataSource: dataSourceAdHoc,
        filterManager: services.filterManager,
        toastNotifications: services.toastNotifications,
      })
    );

    unmount();

    filterUpdates$.next();
    jest.advanceTimersByTime(500);

    expect(services.toastNotifications.addWarning).not.toHaveBeenCalled();
  });
});
