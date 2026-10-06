/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { SavedQuery } from './types';
import type { SavedQueryAttributes } from '../../../common';
export declare const createSavedQueryService: (http: HttpStart) => {
  isDuplicateTitle: (title: string, id?: string) => Promise<boolean>;
  createQuery: (
    attributes: SavedQueryAttributes,
    {
      overwrite,
    }?: {
      overwrite?: boolean | undefined;
    }
  ) => Promise<SavedQuery>;
  updateQuery: (id: string, attributes: SavedQueryAttributes) => Promise<SavedQuery>;
  findSavedQueries: (
    search?: string,
    perPage?: number,
    page?: number
  ) => Promise<{
    total: number;
    queries: SavedQuery[];
  }>;
  getSavedQuery: (id: string) => Promise<SavedQuery>;
  deleteSavedQuery: (id: string) => Promise<{}>;
  getSavedQueryCount: () => Promise<number>;
};
