/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from './data_view';
import { dataViewWithTimefieldMock } from './data_view_with_timefield';

export const savedSearchMock = {
  id: 'the-saved-search-id',
  searchSource: createSearchSourceMock({ index: dataViewMock }),
} as unknown as SavedSearch;

export const savedSearchMockWithTimeField = {
  id: 'the-saved-search-id-with-timefield',
  searchSource: createSearchSourceMock({ index: dataViewWithTimefieldMock }),
} as unknown as SavedSearch;

export const savedSearchMockWithSQL = {
  id: 'the-saved-search-id-sql',
  searchSource: createSearchSourceMock({
    index: dataViewWithTimefieldMock,
    query: { sql: 'SELECT * FROM "the-saved-search-id-sql"' },
  }),
} as unknown as SavedSearch;
