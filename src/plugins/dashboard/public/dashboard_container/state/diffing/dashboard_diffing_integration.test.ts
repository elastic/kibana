/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewFieldBase, DataViewBase } from '@kbn/es-query';
import { buildExistsFilter, disableFilter, pinFilter, toggleFilterNegated } from '@kbn/es-query';

import { getShouldRefresh } from './dashboard_diffing_integration';

import { DashboardContainerInput } from '../../../../common';
import { DashboardContainer } from '../../embeddable/dashboard_container';

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
    test('should return false when filters do not change', () => {
      const lastInput = {
        filters: [existsFilter],
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, lastInput)).toBe(false);
    });

    test('should return true when pinned filters change', () => {
      const pinnedFilter = pinFilter(existsFilter);
      const lastInput = {
        filters: [pinnedFilter],
      } as unknown as DashboardContainerInput;
      const input = {
        filters: [toggleFilterNegated(pinnedFilter)],
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(true);
    });

    test('should return false when disabled filters change', () => {
      const disabledFilter = disableFilter(existsFilter);
      const lastInput = {
        filters: [disabledFilter],
      } as unknown as DashboardContainerInput;
      const input = {
        filters: [toggleFilterNegated(disabledFilter)],
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(false);
    });

    test('should return false when pinned filter changes to unpinned', () => {
      const lastInput = {
        filters: [existsFilter],
      } as unknown as DashboardContainerInput;
      const input = {
        filters: [pinFilter(existsFilter)],
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(false);
    });
  });

  describe('timeRange changes', () => {
    test('should return false when timeRange does not change', () => {
      const lastInput = {
        timeRange: { from: 'now-15m', to: 'now' },
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, lastInput)).toBe(false);
    });

    test('should return true when timeRange changes (timeRestore is true)', () => {
      const lastInput = {
        timeRange: { from: 'now-15m', to: 'now' },
        timeRestore: true,
      } as unknown as DashboardContainerInput;
      const input = {
        timeRange: { from: 'now-30m', to: 'now' },
        timeRestore: true,
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(true);
    });

    test('should return true when timeRange changes (timeRestore is false)', () => {
      const lastInput = {
        timeRange: { from: 'now-15m', to: 'now' },
        timeRestore: false,
      } as unknown as DashboardContainerInput;
      const input = {
        timeRange: { from: 'now-30m', to: 'now' },
        timeRestore: false,
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(true);
    });
  });

  describe('key without custom diffing function (syncColors)', () => {
    test('should return false when syncColors do not change', () => {
      const lastInput = {
        syncColors: false,
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, lastInput)).toBe(false);
    });

    test('should return true when syncColors change', () => {
      const lastInput = {
        syncColors: false,
      } as unknown as DashboardContainerInput;
      const input = {
        syncColors: true,
      } as unknown as DashboardContainerInput;
      expect(getShouldRefresh.bind(dashboardContainerMock)(lastInput, input)).toBe(true);
    });
  });
});
