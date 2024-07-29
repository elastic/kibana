/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { SearchSource } from '@kbn/data-plugin/public';
import { SearchSourceDependencies } from '@kbn/data-plugin/common/search';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SavedSearchPublicPluginStart } from './plugin';
import { SavedSearch } from '../common';
import { SerializableSavedSearch } from '../common/types';
import { SavedSearchUnwrapResult } from './services/saved_searches';

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

const toSavedSearchMock = jest.fn((result, serialized) =>
  Promise.resolve(
    serialized
      ? ({
          title: result.attributes.title,
          serializedSearchSource: createEmptySearchSource().getSerializedFields(),
          managed: false,
        } as SerializableSavedSearch)
      : ({
          title: result.attributes.title,
          searchSource: createEmptySearchSource(),
          managed: false,
        } as SavedSearch)
  )
) as SavedSearchPublicPluginStart['byValueToSavedSearch'];

const savedSearchStartMock = (): SavedSearchPublicPluginStart => ({
  get: jest
    .fn()
    .mockImplementation((id, serialized) =>
      toSavedSearchMock(
        { attributes: { title: 'savedSearchTitle' } } as SavedSearchUnwrapResult,
        serialized
      )
    ),
  getAll: jest.fn(),
  getNew: jest.fn().mockImplementation(() => ({
    searchSource: createEmptySearchSource(),
  })),
  save: jest.fn(),
  checkForDuplicateTitle: jest.fn(),
  byValueToSavedSearch: toSavedSearchMock,
});

export const savedSearchPluginMock = {
  createStartContract: savedSearchStartMock,
};
