/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExistsFilter, disableFilter, pinFilter, toggleFilterNegated } from '@kbn/es-query';
import type { DataViewFieldBase, DataViewBase } from '@kbn/es-query';
import { getShouldRefresh } from './dashboard_diffing_integration';
import { DashboardContainer } from '../../dashboard_container';
import { DashboardContainerByValueInput } from '../../../../../common';

describe('getShouldRefresh', () => {
  const dashboardContainerMock = {
    untilInitialized: () => {},
  } as unknown as DashboardContainer;

  const existsFilter = buildExistsFilter(
    {
      name: 'myFieldName',
    } as DataViewFieldBase,
    {
      id: 'myDataViewId',
    } as DataViewBase
  );

  describe('filter changes', () => {
    test('should return false when filters do not change', async () => {
      const lastInput = {
        filters: [existsFilter],
      } as unknown as DashboardContainerByValueInput;
      expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, lastInput)).toBe(false);
    });

    test('should return true when pinned filters change', async () => {
      const pinnedFilter = pinFilter(existsFilter);
      const lastInput = {
        filters: [pinnedFilter],
      } as unknown as DashboardContainerByValueInput;
      const input = {
        filters: [toggleFilterNegated(pinnedFilter)],
      } as unknown as DashboardContainerByValueInput;
      expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(true);
    });

    test('should return false when disabled filters change', async () => {
      const disabledFilter = disableFilter(existsFilter);
      const lastInput = {
        filters: [disabledFilter],
      } as unknown as DashboardContainerByValueInput;
      const input = {
        filters: [toggleFilterNegated(disabledFilter)],
      } as unknown as DashboardContainerByValueInput;
      expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(false);
    });

    test('should return false when pinned filter changes to unpinned', async () => {
      const lastInput = {
        filters: [existsFilter],
      } as unknown as DashboardContainerByValueInput;
      const input = {
        filters: [pinFilter(existsFilter)],
      } as unknown as DashboardContainerByValueInput;
      expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(false);
    });
  });

  describe('timeRange changes', () => {
    test('should return false when timeRange does not change', async () => {
      const lastInput = {
        timeRange: { from: 'now-15m', to: 'now' },
      } as unknown as DashboardContainerByValueInput;
      expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, lastInput)).toBe(false);
    });

    test('should return true when timeRange changes (timeRestore is true)', async () => {
      const lastInput = {
        timeRange: { from: 'now-15m', to: 'now' },
        timeRestore: true,
      } as unknown as DashboardContainerByValueInput;
      const input = {
        timeRange: { from: 'now-30m', to: 'now' },
        timeRestore: true,
      } as unknown as DashboardContainerByValueInput;
      expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(true);
    });

    test('should return true when timeRange changes (timeRestore is false)', async () => {
      const lastInput = {
        timeRange: { from: 'now-15m', to: 'now' },
        timeRestore: false,
      } as unknown as DashboardContainerByValueInput;
      const input = {
        timeRange: { from: 'now-30m', to: 'now' },
        timeRestore: false,
      } as unknown as DashboardContainerByValueInput;
      expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(true);
    });
  });
});
