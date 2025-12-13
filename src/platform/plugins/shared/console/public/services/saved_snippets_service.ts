/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';

export interface SavedSnippet {
  id?: string;
  title: string;
  description?: string;
  query: string;
  endpoint?: string;
  method?: string;
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
}

export interface FindSavedSnippetsResponse {
  total: number;
  snippets: SavedSnippet[];
}

export const createSavedSnippetsService = (http: HttpStart) => {
  const version = '2023-10-31';
  const basePath = '/internal/console/saved_snippets';

  return {
    async create(snippet: SavedSnippet): Promise<SavedSnippet> {
      return http.post<SavedSnippet>(basePath, {
        body: JSON.stringify(snippet),
        version,
      });
    },

    async find(
      search?: string,
      perPage: number = 20,
      page: number = 1
    ): Promise<FindSavedSnippetsResponse> {
      return http.post<FindSavedSnippetsResponse>(`${basePath}/_find`, {
        body: JSON.stringify({ search, perPage, page }),
        version,
      });
    },

    async get(id: string): Promise<SavedSnippet> {
      return http.get<SavedSnippet>(`${basePath}/${id}`, { version });
    },

    async update(id: string, snippet: SavedSnippet): Promise<SavedSnippet> {
      return http.put<SavedSnippet>(`${basePath}/${id}`, {
        body: JSON.stringify(snippet),
        version,
      });
    },

    async delete(id: string): Promise<void> {
      await http.delete(`${basePath}/${id}`, { version });
    },
  };
};

export type SavedSnippetsService = ReturnType<typeof createSavedSnippetsService>;
