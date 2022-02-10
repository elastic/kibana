/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createMemoryHistory } from 'history';
import { dataPluginMock } from '../../../data/public/mocks';
import { DataPublicPluginStart } from '../../../data/public';
import { DiscoverSearchSessionManager } from '../application/main/services/discover_search_session';

export function createSearchSessionMock() {
  const history = createMemoryHistory();
  const session = dataPluginMock.createStartContract().search.session as jest.Mocked<
    DataPublicPluginStart['search']['session']
  >;
  const searchSessionManager = new DiscoverSearchSessionManager({
    history,
    session,
  });
  return {
    history,
    session,
    searchSessionManager,
  };
}
