/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  ) => Promise<SavedQuery[]>;
  getSavedQuery: (id: string) => Promise<SavedQuery>;
  deleteSavedQuery: (id: string) => Promise<{}>;
  getSavedQueryCount: () => Promise<number>;
}
