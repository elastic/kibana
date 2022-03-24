/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { updateSearchSource } from './update_search_source';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import type { SortOrder } from '../../services/saved_searches';

describe('updateSearchSource', () => {
  const defaults = {
    sampleSize: 50,
    defaultSort: 'asc',
  };

  it('updates a given search source', async () => {
    const searchSource = createSearchSourceMock({});
    updateSearchSource(searchSource, indexPatternMock, [] as SortOrder[], false, defaults);
    expect(searchSource.getField('fields')).toBe(undefined);
    // does not explicitly request fieldsFromSource when not using fields API
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
  });

  it('updates a given search source with the usage of the new fields api', async () => {
    const searchSource = createSearchSourceMock({});
    updateSearchSource(searchSource, indexPatternMock, [] as SortOrder[], true, defaults);
    expect(searchSource.getField('fields')).toEqual([{ field: '*', include_unmapped: 'true' }]);
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
  });
});
