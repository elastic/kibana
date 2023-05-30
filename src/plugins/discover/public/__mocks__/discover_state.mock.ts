/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createBrowserHistory } from 'history';
import {
  savedSearchMockWithTimeField,
  savedSearchMock,
} from '@kbn/unified-discover/src/__mocks__/saved_search';
import { discoverServiceMock } from '@kbn/unified-discover/src/__mocks__/services';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { getDiscoverStateContainer } from '../application/main/services/discover_state';

export function getDiscoverStateMock({
  isTimeBased = true,
  savedSearch,
}: {
  isTimeBased?: boolean;
  savedSearch?: SavedSearch;
}) {
  const history = createBrowserHistory();
  history.push('/');
  const container = getDiscoverStateContainer({
    services: discoverServiceMock,
    history,
  });
  container.savedSearchState.set(
    savedSearch ? savedSearch : isTimeBased ? savedSearchMockWithTimeField : savedSearchMock
  );

  return container;
}
