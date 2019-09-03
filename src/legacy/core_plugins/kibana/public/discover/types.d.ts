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

import { SearchSource } from 'ui/courier';
import { SortOrder } from './doc_table/components/table_header/helpers';

export interface SavedSearch {
  readonly id: string;
  title: string;
  searchSource: SearchSource;
  description?: string;
  columns: string[];
  sort: SortOrder[];
  destroy: () => void;
}
export interface SavedSearchLoader {
  get: (id: string) => Promise<SavedSearch>;
  urlFor: (id: string) => string;
}
