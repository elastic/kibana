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
  const trigger = updateUsedDataViewsTrigger;
  let filter1: Filter;
  let filter2: Filter;

  beforeEach(async () => {
    filterManager = new FilterManager(mockUiSettingsForFilterManager);
    action = await createUpdateUsedDataViewAction(filterManager);

    filter1 = getFilter(
      'index-pattern-1',
      FilterStateStore.APP_STATE,
      true,
      true,
      'key3',
      'value3'
    );
    filter2 = getFilter(
      'index-pattern-2',
      FilterStateStore.APP_STATE,
      false,
      false,
      'key4',
      'value4'
    );
  });

  it('', async () => {
    filterManager.setFilters([filter1, filter2]);
    const filters = filterManager.getFilters();
    expect(filters.length).toBe(2);

    context = {
      trigger,
      initialDataView: 'index-pattern-1',
      newDataView: 'index-pattern-2',
    } as ActionExecutionContext;

    await action.execute(context);

    const filtersMaped = filterManager.getFilters();
  });
});
