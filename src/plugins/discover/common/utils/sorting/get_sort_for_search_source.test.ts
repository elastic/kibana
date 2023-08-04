/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { getSortForSearchSource } from './get_sort_for_search_source';
import { stubDataView, stubDataViewWithoutTimeField } from '@kbn/data-plugin/common/stubs';
import { coreMock } from '@kbn/core/public/mocks';

describe('getSortForSearchSource function', function () {
  const core = coreMock.createStart();
  const uiSettings = core.uiSettings;

  const uiSettingWithAscSorting = coreMock.createStart().uiSettings;
  jest
    .spyOn(uiSettingWithAscSorting, 'get')
    .mockImplementation((key) => (key === SORT_DEFAULT_ORDER_SETTING ? 'asc' : null));

  test('should be a function', function () {
    expect(typeof getSortForSearchSource === 'function').toBeTruthy();
  });

  test('should return an object to use for searchSource when columns are given', function () {
    const cols = [['bytes', 'desc']] as SortOrder[];
    expect(getSortForSearchSource({ sort: cols, dataView: stubDataView, uiSettings })).toEqual([
      { bytes: 'desc' },
    ]);
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataView,
        uiSettings: uiSettingWithAscSorting,
      })
    ).toEqual([{ bytes: 'desc' }]);

    expect(
      getSortForSearchSource({ sort: cols, dataView: stubDataViewWithoutTimeField, uiSettings })
    ).toEqual([{ bytes: 'desc' }]);
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataViewWithoutTimeField,
        uiSettings: uiSettingWithAscSorting,
      })
    ).toEqual([{ bytes: 'desc' }]);
  });

  test('should return an object to use for searchSource when no columns are given', function () {
    const cols = [] as SortOrder[];
    expect(getSortForSearchSource({ sort: cols, dataView: stubDataView, uiSettings })).toEqual([
      { _doc: 'desc' },
    ]);
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataView,
        uiSettings: uiSettingWithAscSorting,
      })
    ).toEqual([{ _doc: 'asc' }]);

    expect(
      getSortForSearchSource({ sort: cols, dataView: stubDataViewWithoutTimeField, uiSettings })
    ).toEqual([{ _score: 'desc' }]);
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataViewWithoutTimeField,
        uiSettings: uiSettingWithAscSorting,
      })
    ).toEqual([{ _score: 'asc' }]);
  });
});
