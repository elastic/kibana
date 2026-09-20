/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  deserializeDiscoverSession,
  serializeDiscoverSession,
  type DiscoverSession,
  type DiscoverSessionTagging,
} from '@kbn/saved-search-plugin/common';
import type {
  SaveDiscoverSessionOptions,
  SaveDiscoverSessionParams,
  SavedSearchPublicPluginStart,
} from '@kbn/saved-search-plugin/public';
import type { DiscoverSessionInternalResponse, DiscoverSessionWarning } from '../../server';
import type { DiscoverSessionClient } from './api_client';

// Coordinates session loading and saving through HTTP or the legacy client, selected by the flag.
// Both paths use the same stored-session conversion, preserving inline IDs and references.
// HTTP saves keep submitted tabs and update only the ID, metadata, and references from the response.

type LegacyDiscoverSessionClient = Pick<
  SavedSearchPublicPluginStart,
  'getDiscoverSession' | 'saveDiscoverSession'
>;

interface DiscoverSessionLoadResult {
  session: DiscoverSession;
  warnings: DiscoverSessionWarning[];
}

// Keep the legacy save types while callers use the existing save flow.
// Revisit those types when the legacy path is removed; the session service can remain.
export interface SessionService {
  get: (id: string) => Promise<DiscoverSessionLoadResult>;
  save: (
    session: SaveDiscoverSessionParams,
    options: SaveDiscoverSessionOptions
  ) => Promise<DiscoverSession | undefined>;
}

/** Selects the REST or legacy path for loading and saving Discover sessions. */
export const createSessionService = ({
  apiClient,
  legacyClient,
  useHttpApi,
  tagging,
}: {
  apiClient: DiscoverSessionClient;
  legacyClient: LegacyDiscoverSessionClient;
  useHttpApi: boolean;
  tagging?: DiscoverSessionTagging;
}): SessionService => {
  if (!useHttpApi) {
    return createLegacySessionService(legacyClient);
  }

  return {
    get: async (id) => {
      const response = await apiClient.get(id);
      return {
        session: deserializeDiscoverSession(
          {
            ...response.data,
            id: response.id,
            managed: response.meta.managed,
            sharingSavedObjectProps: response.resolve,
          },
          tagging
        ),
        warnings: response.warnings ?? [],
      };
    },
    save: async (session, options) => {
      const data = serializeDiscoverSession(session, tagging);
      let response: DiscoverSessionInternalResponse;

      if (options.copyOnSave || session.id === undefined) {
        response = await apiClient.create(data);
      } else {
        response = await apiClient.upsert(session.id, data);
      }

      // Saving confirms the submitted tabs; it does not reload or replace local state.
      return {
        ...session,
        id: response.id,
        managed: response.meta.managed ?? false,
        references: response.data.references,
      };
    },
  };
};

// Remove this fallback and the flag once Discover uses only HTTP.
const createLegacySessionService = (legacyClient: LegacyDiscoverSessionClient): SessionService => ({
  get: async (id) => ({
    session: await legacyClient.getDiscoverSession(id),
    warnings: [],
  }),
  save: (session, options) => legacyClient.saveDiscoverSession(session, options),
});
