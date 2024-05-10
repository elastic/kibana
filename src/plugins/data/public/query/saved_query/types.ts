/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TimeRange } from '@kbn/es-query';
import { RefreshInterval } from '../..';
import { SavedQuery, SavedQueryAttributes } from '../../../common/types';

export type SavedQueryTimeFilter = TimeRange & {
  refreshInterval: RefreshInterval;
};

export type { SavedQuery, SavedQueryAttributes };

export interface SavedQueryService {
  isDuplicateTitle: (title: string, id?: string) => Promise<boolean>;
  createQuery: (attributes: SavedQueryAttributes) => Promise<SavedQuery>;
  updateQuery: (id: string, attributes: SavedQueryAttributes) => Promise<SavedQuery>;
  findSavedQueries: (
    searchText?: string,
    perPage?: number,
    activePage?: number
  ) => Promise<{ total: number; queries: SavedQuery[] }>;
  getSavedQuery: (id: string) => Promise<SavedQuery>;
  deleteSavedQuery: (id: string) => Promise<{}>;
  getSavedQueryCount: () => Promise<number>;
}
