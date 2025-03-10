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
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';
import type { RuntimeStateManager } from '../application/main/state_management/redux';
import { createRuntimeStateManager } from '../application/main/state_management/redux';

export function getDiscoverStateMock({
  isTimeBased = true,
  savedSearch,
  runtimeStateManager,
}: {
  isTimeBased?: boolean;
  savedSearch?: SavedSearch;
  runtimeStateManager?: RuntimeStateManager;
}) {
  const history = createBrowserHistory();
  history.push('/');
  const container = getDiscoverStateContainer({
    services: discoverServiceMock,
    history,
    customizationContext: mockCustomizationContext,
    runtimeStateManager: runtimeStateManager ?? createRuntimeStateManager(),
  });
  container.savedSearchState.set(
    savedSearch ? savedSearch : isTimeBased ? savedSearchMockWithTimeField : savedSearchMock
  );

  return container;
}
