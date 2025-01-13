/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateVolatileSearchSource } from './update_search_source';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import { Filter } from '@kbn/es-query';

describe('updateVolatileSearchSource', () => {
  test('updates a given search source', async () => {
    const searchSource = createSearchSourceMock({});

    updateVolatileSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
      sort: [] as SortOrder[],
      customFilters: [],
    });

    expect(searchSource.getField('fields')).toEqual([{ field: '*', include_unmapped: true }]);
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
  });

  test('should properly update the search source with the given custom filters', async () => {
    const searchSource = createSearchSourceMock({});
    const filter = { meta: { index: 'foo', key: 'bar' } } as Filter;

    updateVolatileSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
      sort: [] as SortOrder[],
      customFilters: [filter],
    });

    expect(searchSource.getField('filter')).toEqual([filter]);
  });
});
