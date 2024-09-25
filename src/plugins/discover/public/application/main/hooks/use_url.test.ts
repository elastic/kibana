/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { useUrl } from './use_url';
import {
  savedSearchMockWithTimeField,
  savedSearchMockWithTimeFieldNew,
} from '../../../__mocks__/saved_search';
import { SavedSearch } from '@kbn/saved-search-plugin/public';

function prepareTest(savedSearch: SavedSearch, path: string) {
  const { history } = createSearchSessionMock();
  const onNewUrl = jest.fn();

  renderHook(() =>
    useUrl({
      history,
      savedSearchId: savedSearch.id,
      onNewUrl,
    })
  );
  history.push(path);
  return { load: onNewUrl };
}
describe('test useUrl when the url is changed to /', () => {
  test('loadSavedSearch is not triggered when the url is e.g. /new', () => {
    // the switch to loading the new saved search is taken care in the main route
    const { load } = prepareTest(savedSearchMockWithTimeFieldNew, '/new');
    expect(load).toHaveBeenCalledTimes(0);
  });
  test('loadSavedSearch is not triggered when a persisted saved search is pre-selected', () => {
    // the switch to loading the new saved search is taken care in the main route
    const { load } = prepareTest(savedSearchMockWithTimeField, '/');
    expect(load).toHaveBeenCalledTimes(0);
  });
  test('loadSavedSearch is triggered when a new saved search is pre-selected', () => {
    const { load } = prepareTest(savedSearchMockWithTimeFieldNew, '/');
    expect(load).toHaveBeenCalledTimes(1);
  });
});
