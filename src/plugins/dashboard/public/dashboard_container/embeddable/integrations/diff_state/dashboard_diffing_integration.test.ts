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

  test('should return true when pinned filters change', async () => {
    const pinnedFilter = pinFilter(existsFilter);
    const lastInput = {
      filters: [pinnedFilter],
    } as unknown as DashboardContainerByValueInput;
    const input = {
      filters: [toggleFilterNegated(pinnedFilter)],
    } as unknown as DashboardContainerByValueInput;
    expect(await getShouldRefresh.bind(dashboardContainerMock)(lastInput, { ...lastInput })).toBe(
      false
    );
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
