/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type {
  SaveDiscoverSessionOptions,
  SaveDiscoverSessionParams,
  SavedSearchPublicPluginStart,
} from '@kbn/saved-search-plugin/public';
import type { DiscoverSessionClient } from './api_client';
import { fromDiscoverSessionApiResponse, toDiscoverSessionApiData } from './state_adapter';

type LegacyDiscoverSessionClient = Pick<
  SavedSearchPublicPluginStart,
  'getDiscoverSession' | 'saveDiscoverSession'
>;

// This temporary contract matches the legacy client so Discover can switch persistence paths
// without changing its save flow. Replace these legacy types when the legacy path is removed.
export interface DiscoverSessionPersistence {
  get: (id: string) => Promise<DiscoverSession>;
  save: (
    session: SaveDiscoverSessionParams,
    options: SaveDiscoverSessionOptions
  ) => Promise<DiscoverSession | undefined>;
}

/** Selects the REST or legacy persistence path for every core Discover session operation. */
export const createDiscoverSessionPersistence = ({
  apiClient,
  legacyClient,
  useHttpApi,
}: {
  apiClient: DiscoverSessionClient;
  legacyClient: LegacyDiscoverSessionClient;
  useHttpApi: boolean;
}): DiscoverSessionPersistence => {
  if (!useHttpApi) {
    return {
      get: (id) => legacyClient.getDiscoverSession(id),
      save: (session, options) => legacyClient.saveDiscoverSession(session, options),
    };
  }

  return {
    get: async (id) => {
      const response = await apiClient.get(id);
      return fromDiscoverSessionApiResponse(response, id);
    },
    save: async (session, options) => {
      const data = toDiscoverSessionApiData(session);
      if (options.copyOnSave || session.id === undefined) {
        const response = await apiClient.create(data);
        return fromDiscoverSessionApiResponse(response, undefined, session.tabs);
      }

      const response = await apiClient.upsert(session.id, data);
      return fromDiscoverSessionApiResponse(response, undefined, session.tabs);
    },
  };
};
