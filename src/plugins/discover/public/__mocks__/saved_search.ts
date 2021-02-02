/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedSearch } from '../saved_searches';

export const savedSearchMock = ({
  id: 'the-saved-search-id',
  type: 'search',
  attributes: {
    title: 'the-saved-search-title',
    kibanaSavedObjectMeta: {
      searchSourceJSON:
        '{"highlightAll":true,"version":true,"query":{"query":"foo : \\"bar\\" ","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
  },
  references: [
    {
      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      type: 'index-pattern',
      id: 'the-index-pattern-id',
    },
  ],
  migrationVersion: { search: '7.5.0' },
  error: undefined,
} as unknown) as SavedSearch;
