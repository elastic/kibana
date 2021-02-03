/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { RefreshInterval, TimeRange, Query, Filter } from '../..';

export type SavedQueryTimeFilter = TimeRange & {
  refreshInterval: RefreshInterval;
};

export interface SavedQuery {
  id: string;
  attributes: SavedQueryAttributes;
}

export interface SavedQueryAttributes {
  title: string;
  description: string;
  query: Query;
  filters?: Filter[];
  timefilter?: SavedQueryTimeFilter;
}

export interface SavedQueryService {
  saveQuery: (
    attributes: SavedQueryAttributes,
    config?: { overwrite: boolean }
  ) => Promise<SavedQuery>;
  getAllSavedQueries: () => Promise<SavedQuery[]>;
  findSavedQueries: (
    searchText?: string,
    perPage?: number,
    activePage?: number
  ) => Promise<{ total: number; queries: SavedQuery[] }>;
  getSavedQuery: (id: string) => Promise<SavedQuery>;
  deleteSavedQuery: (id: string) => Promise<{}>;
  getSavedQueryCount: () => Promise<number>;
}
