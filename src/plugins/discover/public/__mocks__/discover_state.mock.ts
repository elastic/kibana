/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBrowserHistory } from 'history';
import { getDiscoverStateContainer } from '../application/main/state_management/discover_state';
import { savedSearchMockWithTimeField, savedSearchMock } from './saved_search';
import { discoverServiceMock } from './services';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';

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
    customizationContext: mockCustomizationContext,
  });
  container.savedSearchState.set(
    savedSearch ? savedSearch : isTimeBased ? savedSearchMockWithTimeField : savedSearchMock
  );

  return container;
}
