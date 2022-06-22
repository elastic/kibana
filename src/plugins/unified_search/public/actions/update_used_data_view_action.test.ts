/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { Filter, FilterStateStore } from '@kbn/es-query';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public/actions';
import { createUpdateUsedDataViewAction } from './update_used_data_view_action';
import { updateUsedDataViewsTrigger } from '../triggers';
import { getFilter } from './get_stub_filter';

beforeEach(() => jest.resetAllMocks());
const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

describe('update used data view action', () => {
  let context: ActionExecutionContext;
  let filterManager: FilterManager;
  let action: Action<object>;
  let filter1: Filter;
  let filter2: Filter;
  const trigger = updateUsedDataViewsTrigger;
  const INDEX_PATTERN_1 = 'INDEX_PATTERN_1';
  const INDEX_PATTERN_2 = 'INDEX_PATTERN_2';
  const INDEX_PATTERN_3 = 'INDEX_PATTERN_3';

  beforeEach(async () => {
    filterManager = new FilterManager(mockUiSettingsForFilterManager);
    action = await createUpdateUsedDataViewAction(filterManager);

    filter1 = getFilter(INDEX_PATTERN_1, FilterStateStore.APP_STATE, true, true, 'key3', 'value3');
    filter2 = getFilter(
      INDEX_PATTERN_2,
      FilterStateStore.APP_STATE,
      false,
      false,
      'key4',
      'value4'
    );
  });

  it('Scenario: Change filter reference when adjusting 1 layer', async () => {
    context = {
      trigger,
      initialDataView: INDEX_PATTERN_1,
      newDataView: INDEX_PATTERN_2,
      usedDataViews: [INDEX_PATTERN_1, INDEX_PATTERN_2],
    } as ActionExecutionContext;

    filterManager.setFilters([filter1]);

    await action.execute(context);

    const filtersAfterActionExecuted = filterManager.getFilters();
    const filteredFilter = filtersAfterActionExecuted.filter(
      (f) => f.meta.index === INDEX_PATTERN_2
    );
    expect(filteredFilter.length).toEqual(1);
  });

  it('Scenario: Change filter reference when adjusting 2 or more layers', async () => {
    context = {
      trigger,
      initialDataView: INDEX_PATTERN_1,
      newDataView: INDEX_PATTERN_3,
      usedDataViews: [INDEX_PATTERN_1, INDEX_PATTERN_2, INDEX_PATTERN_3],
    } as ActionExecutionContext;

    filterManager.setFilters([filter1, filter2]);

    await action.execute(context);

    const filtersAfterActionExecuted = filterManager.getFilters();
    const filteredFilter = filtersAfterActionExecuted.filter(
      (f) => f.meta.index === INDEX_PATTERN_3
    );
    expect(filteredFilter.length).toEqual(1);
  });

  it('Scenario: change references only for incompatible cases', async () => {
    context = {
      trigger,
      initialDataView: INDEX_PATTERN_1,
      newDataView: INDEX_PATTERN_2,
      usedDataViews: [INDEX_PATTERN_1, INDEX_PATTERN_2],
    } as ActionExecutionContext;

    filterManager.setFilters([filter1, filter2]);

    await action.execute(context);

    const filtersAfterActionExecuted = filterManager.getFilters();
    const filteredFilter = filtersAfterActionExecuted.filter(
      (f) => f.meta.index === INDEX_PATTERN_2
    );
    expect(filteredFilter.length).toEqual(1);
  });

  it('Scenario: Change filter reference when removing one of configured layers', async () => {
    context = {
      trigger,
      initialDataView: INDEX_PATTERN_1,
      newDataView: INDEX_PATTERN_2,
      usedDataViews: [INDEX_PATTERN_1, INDEX_PATTERN_2],
      globalDataView: INDEX_PATTERN_2,
    } as ActionExecutionContext;

    filterManager.setFilters([filter1]);

    await action.execute(context);

    const filtersAfterActionExecuted = filterManager.getFilters();
    const filteredFilter = filtersAfterActionExecuted.filter(
      (f) => f.meta.index === INDEX_PATTERN_2
    );
    expect(filteredFilter.length).toEqual(1);
  });

  it('Scenario: Change filter reference when removing all layers (one layer was configured)', async () => {
    context = {
      trigger,
      initialDataView: INDEX_PATTERN_1,
      newDataView: INDEX_PATTERN_2,
      usedDataViews: [INDEX_PATTERN_1, INDEX_PATTERN_2],
      globalDataView: INDEX_PATTERN_2,
    } as ActionExecutionContext;

    filterManager.setFilters([filter1]);

    await action.execute(context);

    const filtersAfterActionExecuted = filterManager.getFilters();
    const filteredFilter = filtersAfterActionExecuted.filter(
      (f) => f.meta.index === INDEX_PATTERN_2
    );
    expect(filteredFilter.length).toEqual(1);
  });

  it('Scenario: Add new filter from the Unified Search Panel', async () => {
    context = {
      trigger,
      initialDataView: INDEX_PATTERN_1,
      newDataView: INDEX_PATTERN_2,
      usedDataViews: [INDEX_PATTERN_1, INDEX_PATTERN_2],
      globalDataView: INDEX_PATTERN_2,
    } as ActionExecutionContext;

    filterManager.setFilters([filter1]);

    await action.execute(context);

    const filtersAfterActionExecuted = filterManager.getFilters();
    const filteredFilter = filtersAfterActionExecuted.filter(
      (f) => f.meta.index === INDEX_PATTERN_2
    );
    expect(filteredFilter.length).toEqual(1);
  });
});
