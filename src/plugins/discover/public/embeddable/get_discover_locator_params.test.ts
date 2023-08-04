/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedSearchMock } from '../__mocks__/saved_search';
import { getDiscoverLocatorParams } from './get_discover_locator_params';
import type { SearchInput } from './types';

describe('getDiscoverLocatorParams', () => {
  it('should return saved search id if input has savedObjectId', () => {
    const input = { savedObjectId: 'savedObjectId' } as SearchInput;
    expect(getDiscoverLocatorParams({ input, savedSearch: savedSearchMock })).toEqual({
      savedSearchId: 'savedObjectId',
    });
  });

  it('should return Discover params if input has no savedObjectId', () => {
    const input = {} as SearchInput;
    expect(getDiscoverLocatorParams({ input, savedSearch: savedSearchMock })).toEqual({
      dataViewId: savedSearchMock.searchSource.getField('index')?.id,
      dataViewSpec: savedSearchMock.searchSource.getField('index')?.toMinimalSpec(),
      timeRange: savedSearchMock.timeRange,
      refreshInterval: savedSearchMock.refreshInterval,
      filters: savedSearchMock.searchSource.getField('filter'),
      query: savedSearchMock.searchSource.getField('query'),
      columns: savedSearchMock.columns,
      sort: savedSearchMock.sort,
      viewMode: savedSearchMock.viewMode,
      hideAggregatedPreview: savedSearchMock.hideAggregatedPreview,
      breakdownField: savedSearchMock.breakdownField,
    });
  });
});
