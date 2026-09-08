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
import { prepareDiscoverSession } from './prepare_session';
import { getDiscoverSessionReferences, toDiscoverSessionApiData } from './state_adapter';

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

// Keep the legacy save types while callers use the existing save flow.
// Revisit those types when the legacy path is removed; the persistence service can remain.
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
    return createLegacyPersistence(legacyClient);
  }

  return {
    get: async (id) => {
      const response = await apiClient.get(id);
      return {
        session: prepareDiscoverSession(response, response.resolve),
        warnings: response.warnings ?? [],
      };
    },
    save: async (session, options) => {
      const data = toDiscoverSessionApiData(session);
      let response: Awaited<ReturnType<DiscoverSessionClient['create']>>;

      if (options.copyOnSave || session.id === undefined) {
        response = await apiClient.create(data);
      } else {
        response = await apiClient.upsert(session.id, data);
      }

      // Saving confirms the submitted tabs; it does not reload them. The API document omits
      // local values such as pinned filters, inline IDs, and the live chart fingerprint.
      return {
        ...session,
        id: response.id,
        managed: response.meta.managed ?? false,
        references: getDiscoverSessionReferences(response.data),
      };
    },
  };
};

// Remove this fallback and the flag once Discover uses only HTTP.
const createLegacyPersistence = (
  legacyClient: LegacyDiscoverSessionClient
): DiscoverSessionPersistence => ({
  get: async (id) => ({
    session: await legacyClient.getDiscoverSession(id),
    warnings: [],
  }),
  save: (session, options) => legacyClient.saveDiscoverSession(session, options),
});
