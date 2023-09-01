/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { SavedQuery } from './types';
import type { SavedQueryAttributes } from '../../../common';
import { SAVED_QUERY_BASE_URL } from '../../../common/constants';

const version = '1';

export const createSavedQueryService = (http: HttpStart) => {
  const createQuery = async (attributes: SavedQueryAttributes, { overwrite = false } = {}) => {
    const savedQuery = await http.post<SavedQuery>(`${SAVED_QUERY_BASE_URL}/_create`, {
      body: JSON.stringify(attributes),
      version,
    });
    return savedQuery;
  };

  const updateQuery = async (id: string, attributes: SavedQueryAttributes) => {
    const savedQuery = await http.put<SavedQuery>(`${SAVED_QUERY_BASE_URL}/${id}`, {
      body: JSON.stringify(attributes),
      version,
    });
    return savedQuery;
  };

  // we have to tell the saved objects client how many to fetch, otherwise it defaults to fetching 20 per page
  const getAllSavedQueries = async (): Promise<SavedQuery[]> => {
    const { savedQueries } = await http.post<{ savedQueries: SavedQuery[] }>(
      `${SAVED_QUERY_BASE_URL}/_all`,
      { version }
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
    }>(`${SAVED_QUERY_BASE_URL}/_find`, {
      body: JSON.stringify({ page, perPage, search }),
      version,
    });

    return { total, queries };
  };

  const getSavedQuery = (id: string): Promise<SavedQuery> => {
    return http.get<SavedQuery>(`${SAVED_QUERY_BASE_URL}/${id}`, { version });
  };

  const deleteSavedQuery = (id: string) => {
    return http.delete<{}>(`${SAVED_QUERY_BASE_URL}/${id}`, { version });
  };

  const getSavedQueryCount = async (): Promise<number> => {
    return http.get<number>(`${SAVED_QUERY_BASE_URL}/_count`, { version });
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
