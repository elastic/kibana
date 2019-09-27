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

import { Filter, FilterMeta } from './meta_filter';

interface TimeRange {
  from: string;
  to: string;
}

interface RefreshInterval {
  pause: boolean;
  value: number;
}
interface Query {
  query: string | { [key: string]: any };
}

type SavedQueryTimeFilter = TimeRange & {
  refreshInterval: RefreshInterval;
};
interface SavedQueryAttributes {
  title: string;
  description: string;
  query: Query;
  filters?: Filter[];
  timefilter?: SavedQueryTimeFilter;
}
export interface SavedQuery {
  id: string;
  attributes: SavedQueryAttributes;
}
interface SavedQueryParams {
  savedQuery: SavedQuery;
}
export type SavedQueryFilterMeta = FilterMeta & {
  params: SavedQueryParams; // the full saved query
};

export type SavedQueryFilter = Filter & {
  meta: SavedQueryFilterMeta;
  saved_query: string;
};

export const isSavedQueryFilter = (filter: any): filter is SavedQueryFilter =>
  filter && filter.meta && filter.meta.type === 'savedQuery';
