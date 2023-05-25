/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { of } from 'rxjs';
import { SearchSource, IKibanaSearchResponse } from '@kbn/data-plugin/public';
import { SearchSourceDependencies } from '@kbn/data-plugin/common/search';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

const createEmptySearchSource = jest.fn(() => {
  const deps = {
    getConfig: jest.fn(),
  } as unknown as SearchSourceDependencies;
  const searchSource = new SearchSource({}, deps);
  searchSource.fetch$ = jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }));
  searchSource.createChild = jest.fn((options = {}) => {
    const childSearchSource = new SearchSource({}, deps);
    childSearchSource.setParent(searchSource, options);
    childSearchSource.fetch$ = <T>() =>
      of({ rawResponse: { hits: { hits: [] } } } as unknown as IKibanaSearchResponse<
        SearchResponse<T>
      >);
    return childSearchSource;
  });
  return searchSource;
});

const savedSearchStartMock = () => ({
  get: jest.fn().mockImplementation(() => ({
    id: 'savedSearch',
    title: 'savedSearchTitle',
    searchSource: createEmptySearchSource(), // searchSourceInstanceMock,
  })),
  getAll: jest.fn(),
  getNew: jest.fn().mockImplementation(() => ({
    searchSource: createEmptySearchSource(), // searchSourceInstanceMock,
  })),
  save: jest.fn(),
  find: jest.fn(),
});

export const savedSearchPluginMock = {
  createStartContract: savedSearchStartMock,
};
