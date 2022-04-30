/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from 'src/core/public';
import { SavedQuery } from './types';
import type { SavedQueryAttributes } from '../../../common';

export const createSavedQueryService = (http: HttpStart) => {
  const createQuery = async (attributes: SavedQueryAttributes, { overwrite = false } = {}) => {
    const savedQuery = await http.post<SavedQuery>('/api/saved_query/_create', {
      body: JSON.stringify(attributes),
    });
    return savedQuery;
  };

  const updateQuery = async (id: string, attributes: SavedQueryAttributes) => {
    const savedQuery = await http.put<SavedQuery>(`/api/saved_query/${id}`, {
      body: JSON.stringify(attributes),
    });
    return savedQuery;
  };

  // we have to tell the saved objects client how many to fetch, otherwise it defaults to fetching 20 per page
  const getAllSavedQueries = async (): Promise<SavedQuery[]> => {
    const { savedQueries } = await http.post<{ savedQueries: SavedQuery[] }>(
      '/api/saved_query/_all'
    );
    return savedQueries;
  };

  // findSavedQueries will do a 'match_all' if no search string is passed in
  const findSavedQueries = async (
    search: string = '',
    perPage: number = 50,
    page: number = 1
  ): Promise<{ total: number; queries: SavedQuery[] }> => {
    const { total, savedQueries: queries } = await http.post<{
      savedQueries: SavedQuery[];
      total: number;
    }>('/api/saved_query/_find', {
      body: JSON.stringify({ page, perPage, search }),
    });

    return { total, queries };
  };

  const getSavedQuery = (id: string): Promise<SavedQuery> => {
    return http.get<SavedQuery>(`/api/saved_query/${id}`);
  };

  const deleteSavedQuery = (id: string) => {
    return http.delete<{}>(`/api/saved_query/${id}`);
  };

  const getSavedQueryCount = async (): Promise<number> => {
    return http.get<number>('/api/saved_query/_count');
  };

  return {
    createQuery,
    updateQuery,
    getAllSavedQueries,
    findSavedQueries,
    getSavedQuery,
    deleteSavedQuery,
    getSavedQueryCount,
  };
};
