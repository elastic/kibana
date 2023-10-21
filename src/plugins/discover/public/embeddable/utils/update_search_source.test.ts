/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { updateSearchSource } from './update_search_source';
import {
  buildDataViewMock,
  dataViewMock,
  shallowMockedFields,
} from '@kbn/discover-utils/src/__mocks__';
import type { SortOrder } from '@kbn/saved-search-plugin/public';

const dataViewMockWithTimeField = buildDataViewMock({
  name: 'the-data-view',
  fields: shallowMockedFields,
  timeFieldName: '@timestamp',
});

describe('updateSearchSource', () => {
  const defaults = {
    sortDir: 'asc',
  };

  const customSampleSize = 70;

  it('updates a given search source', async () => {
    const searchSource = createSearchSourceMock({});
    updateSearchSource(
      searchSource,
      dataViewMock,
      [] as SortOrder[],
      customSampleSize,
      false,
      defaults
    );
    expect(searchSource.getField('fields')).toBe(undefined);
    // does not explicitly request fieldsFromSource when not using fields API
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
    expect(searchSource.getField('size')).toEqual(customSampleSize);
  });

  it('updates a given search source with the usage of the new fields api', async () => {
    const searchSource = createSearchSourceMock({});
    updateSearchSource(
      searchSource,
      dataViewMock,
      [] as SortOrder[],
      customSampleSize,
      true,
      defaults
    );
    expect(searchSource.getField('fields')).toEqual([{ field: '*', include_unmapped: 'true' }]);
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
    expect(searchSource.getField('size')).toEqual(customSampleSize);
  });

  it('updates a given search source with sort field', async () => {
    const searchSource1 = createSearchSourceMock({});
    updateSearchSource(
      searchSource1,
      dataViewMock,
      [] as SortOrder[],
      customSampleSize,
      true,
      defaults
    );
    expect(searchSource1.getField('sort')).toEqual([{ _score: 'asc' }]);

    const searchSource2 = createSearchSourceMock({});
    updateSearchSource(
      searchSource2,
      dataViewMockWithTimeField,
      [] as SortOrder[],
      customSampleSize,
      true,
      {
        sortDir: 'desc',
      }
    );
    expect(searchSource2.getField('sort')).toEqual([{ _doc: 'desc' }]);

    const searchSource3 = createSearchSourceMock({});
    updateSearchSource(
      searchSource3,
      dataViewMockWithTimeField,
      [['bytes', 'desc']] as SortOrder[],
      customSampleSize,
      true,
      defaults
    );
    expect(searchSource3.getField('sort')).toEqual([
      {
        bytes: 'desc',
      },
      {
        _doc: 'desc',
      },
    ]);
  });
});
