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

type DiscoverSessionLoadWarning = NonNullable<
  Awaited<ReturnType<DiscoverSessionClient['get']>>['warnings']
>[number];

interface DiscoverSessionLoadResult {
  session: DiscoverSession;
  warnings: DiscoverSessionLoadWarning[];
}

// This temporary contract keeps the legacy save types while Discover switches persistence paths.
// Replace those types when the legacy path is removed.
export interface DiscoverSessionPersistence {
  get: (id: string) => Promise<DiscoverSessionLoadResult>;
  save: (
    session: SaveDiscoverSessionParams,
    options: SaveDiscoverSessionOptions
  ) => Promise<DiscoverSession | undefined>;
}

/** Selects the REST or legacy path for loading and saving Discover sessions. */
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
      get: async (id) => ({
        session: await legacyClient.getDiscoverSession(id),
        warnings: [],
      }),
      save: (session, options) => legacyClient.saveDiscoverSession(session, options),
    };
  }

  return {
    get: async (id) => {
      const response = await apiClient.get(id);
      return {
        session: fromDiscoverSessionApiResponse(response, response.resolve),
        warnings: response.warnings ?? [],
      };
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
