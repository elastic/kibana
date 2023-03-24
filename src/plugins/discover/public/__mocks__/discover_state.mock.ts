/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createBrowserHistory, History } from 'history';
import { getDiscoverStateContainer } from '../application/main/services/discover_state';
import { savedSearchMockWithTimeField, savedSearchMock } from './saved_search';
import { discoverServiceMock } from './services';
import { SavedSearch } from '@kbn/saved-search-plugin/public';

export function getDiscoverStateMock({
  isTimeBased = true,
  savedSearch,
  history,
}: {
  isTimeBased?: boolean;
  savedSearch?: SavedSearch;
  history?: History;
}) {
  const actualHistory = history ? history : createBrowserHistory();
  actualHistory.push('/');
  const container = getDiscoverStateContainer({
    services: discoverServiceMock,
    history: actualHistory,
  });
  container.savedSearchState.set(
    savedSearch ? savedSearch : isTimeBased ? savedSearchMockWithTimeField : savedSearchMock
  );

  return container;
}
