/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createBrowserHistory } from 'history';
import { getDiscoverStateContainer } from '../application/main/services/discover_state';
import { savedSearchMockWithTimeField, savedSearchMock } from './saved_search';
import { discoverServiceMock } from './services';

export function getDiscoverStateMock({ isTimeBased = true }) {
  const history = createBrowserHistory();
  history.push('/');
  return getDiscoverStateContainer({
    savedSearch: isTimeBased ? savedSearchMockWithTimeField : savedSearchMock,
    services: discoverServiceMock,
    history,
  });
}
