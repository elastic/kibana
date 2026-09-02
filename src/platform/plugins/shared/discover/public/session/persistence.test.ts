/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { SaveDiscoverSessionParams } from '@kbn/saved-search-plugin/public';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import type { DiscoverSessionClient } from './api_client';
import { createDiscoverSessionPersistence } from './persistence';

const apiResponse: Awaited<ReturnType<DiscoverSessionClient['get']>> = {
  id: 'session-id',
  data: {
    title: 'Session',
    description: '',
    tabs: [],
  },
  meta: { managed: false },
};

const session: SaveDiscoverSessionParams = {
  id: 'session-id',
  title: 'Session',
  description: '',
  tabs: [],
};
const persistedSession: DiscoverSession = {
  ...session,
  id: 'session-id',
  managed: false,
};

describe('Discover session persistence', () => {
  it('uses the REST client when the local switch is enabled', async () => {
    const apiClient = createApiClient();
    const legacyClient = savedSearchPluginMock.createStartContract();
    const persistence = createDiscoverSessionPersistence({
      apiClient,
      legacyClient,
      useHttpApi: true,
    });

    await persistence.get('session-id');
    await persistence.save(session, { copyOnSave: false });

    expect(apiClient.get).toHaveBeenCalledWith('session-id');
    expect(apiClient.upsert).toHaveBeenCalledWith('session-id', apiResponse.data);
    expect(legacyClient.getDiscoverSession).not.toHaveBeenCalled();
    expect(legacyClient.saveDiscoverSession).not.toHaveBeenCalled();
  });

  it('uses the legacy client when the local switch is disabled', async () => {
    const apiClient = createApiClient();
    const legacyClient = savedSearchPluginMock.createStartContract();
    jest.mocked(legacyClient.getDiscoverSession).mockResolvedValue(persistedSession);
    jest.mocked(legacyClient.saveDiscoverSession).mockResolvedValue(persistedSession);
    const persistence = createDiscoverSessionPersistence({
      apiClient,
      legacyClient,
      useHttpApi: false,
    });

    await persistence.get('session-id');
    await persistence.save(session, { copyOnSave: false });

    expect(legacyClient.getDiscoverSession).toHaveBeenCalledWith('session-id');
    expect(legacyClient.saveDiscoverSession).toHaveBeenCalledWith(session, {
      copyOnSave: false,
    });
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.upsert).not.toHaveBeenCalled();
  });
});

const createApiClient = (): jest.Mocked<DiscoverSessionClient> => ({
  create: jest.fn().mockResolvedValue(apiResponse),
  get: jest.fn().mockResolvedValue(apiResponse),
  upsert: jest.fn().mockResolvedValue(apiResponse),
});
