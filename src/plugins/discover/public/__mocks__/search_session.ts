/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMemoryHistory } from 'history';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DiscoverSearchSessionManager } from '../application/main/state_management/discover_search_session';

export function createSearchSessionMock(
  session = dataPluginMock.createStartContract().search.session as jest.Mocked<
    DataPublicPluginStart['search']['session']
  >
) {
  const history = createMemoryHistory();
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
