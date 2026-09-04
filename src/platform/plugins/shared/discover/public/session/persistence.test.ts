/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  VIEW_MODE,
  type DiscoverSession,
  type DiscoverSessionTab,
} from '@kbn/saved-search-plugin/common';
import type { SaveDiscoverSessionParams } from '@kbn/saved-search-plugin/public';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import type { DiscoverSessionClient } from './api_client';
import { createDiscoverSessionPersistence } from './persistence';

type ApiResponse = Awaited<ReturnType<DiscoverSessionClient['get']>>;

const runtimeTab: DiscoverSessionTab = {
  id: 'logs-tab',
  label: 'Logs',
  sort: [],
  columns: [],
  grid: {},
  hideChart: false,
  hideTable: false,
  isTextBasedQuery: false,
  usesAdHocDataView: false,
  serializedSearchSource: { index: 'logs-data-view' },
};

const apiData: ApiResponse['data'] = {
  title: 'Session',
  description: '',
  tabs: [
    {
      id: 'logs-tab',
      label: 'Logs',
      sort: [],
      column_order: [],
      filters: [],
      data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
      view_mode: VIEW_MODE.DOCUMENT_LEVEL,
      hide_chart: false,
      hide_table: false,
    },
  ],
};

const apiResponse: ApiResponse = {
  id: 'session-id',
  data: apiData,
  meta: { managed: false },
};

const session: SaveDiscoverSessionParams = {
  id: 'session-id',
  title: 'Session',
  description: '',
  tabs: [runtimeTab],
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

    const loadedSession = await persistence.get('session-id');
    const savedSession = await persistence.save(session, { copyOnSave: false });

    expect(apiClient.get).toHaveBeenCalledWith('session-id');
    expect(apiClient.upsert).toHaveBeenCalledWith('session-id', apiData);
    expect(apiClient.create).not.toHaveBeenCalled();
    expect(legacyClient.getDiscoverSession).not.toHaveBeenCalled();
    expect(legacyClient.saveDiscoverSession).not.toHaveBeenCalled();
    expect(loadedSession).toEqual(savedSession);
    expect(savedSession).toEqual(
      expect.objectContaining({
        id: 'session-id',
        title: 'Session',
        tabs: [expect.objectContaining({ id: 'logs-tab', label: 'Logs' })],
      })
    );
  });

  it('creates a session through the REST client when saving a copy', async () => {
    const apiClient = createApiClient();
    const legacyClient = savedSearchPluginMock.createStartContract();
    const persistence = createDiscoverSessionPersistence({
      apiClient,
      legacyClient,
      useHttpApi: true,
    });

    const savedSession = await persistence.save(session, { copyOnSave: true });

    expect(apiClient.create).toHaveBeenCalledWith(apiData);
    expect(apiClient.upsert).not.toHaveBeenCalled();
    expect(legacyClient.saveDiscoverSession).not.toHaveBeenCalled();
    expect(savedSession).toEqual(
      expect.objectContaining({
        id: 'session-id',
        tabs: [expect.objectContaining({ id: 'logs-tab' })],
      })
    );
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

    const loadedSession = await persistence.get('session-id');
    const savedSession = await persistence.save(session, { copyOnSave: false });

    expect(legacyClient.getDiscoverSession).toHaveBeenCalledWith('session-id');
    expect(legacyClient.saveDiscoverSession).toHaveBeenCalledWith(session, {
      copyOnSave: false,
    });
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.upsert).not.toHaveBeenCalled();
    expect(loadedSession).toBe(persistedSession);
    expect(savedSession).toBe(persistedSession);
  });
});

const createApiClient = (): jest.Mocked<DiscoverSessionClient> => ({
  create: jest.fn().mockResolvedValue(apiResponse),
  get: jest.fn().mockResolvedValue(apiResponse),
  upsert: jest.fn().mockResolvedValue(apiResponse),
});
