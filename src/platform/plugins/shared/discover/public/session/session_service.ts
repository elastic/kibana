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
} from '@kbn/saved-search-plugin/public';
import type { DiscoverSessionWarning } from '../../server';
import type { DiscoverSessionInternalResponse } from '../../server/api/internal_schema';
import type { DiscoverSessionClient } from './api_client';
import {
  fromDiscoverSessionApiResponse,
  getDiscoverSessionReferences,
  toDiscoverSessionApiData,
} from './session_conversions';

// Coordinates session loading and saving through the HTTP API.
// Loads convert the API response and return its warnings without showing UI.
// Internal routes preserve inline Data View IDs; tab restoration fills any missing IDs.
// Saves convert the session into a create or upsert request, then keep the submitted tabs
// and update only the session ID, metadata, and references from the response.

interface DiscoverSessionLoadResult {
  session: DiscoverSession;
  warnings: DiscoverSessionWarning[];
}

export interface DiscoverSessionService {
  get: (id: string) => Promise<DiscoverSessionLoadResult>;
  save: (
    session: SaveDiscoverSessionParams,
    options: SaveDiscoverSessionOptions
  ) => Promise<DiscoverSession | undefined>;
}

/** Loads and saves Discover sessions through the HTTP API. */
export const createDiscoverSessionService = ({
  apiClient,
}: {
  apiClient: DiscoverSessionClient;
}): DiscoverSessionService => {
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
      let response: DiscoverSessionInternalResponse;

      if (options.copyOnSave || session.id === undefined) {
        response = await apiClient.create(data);
      } else {
        response = await apiClient.upsert(session.id, data);
      }

      // Saving confirms the submitted tabs; it does not reload them. The API document omits
      // local values such as pin markers, control order numbers, and the live chart fingerprint.
      return {
        ...session,
        id: response.id,
        managed: response.meta.managed ?? false,
        version: response.meta.version,
        references: getDiscoverSessionReferences(response.data),
      };
    },
  };
};
