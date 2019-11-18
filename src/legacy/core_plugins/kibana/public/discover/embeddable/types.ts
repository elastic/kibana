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

import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from 'src/plugins/embeddable/public';
import { StaticIndexPattern } from '../kibana_services';
import { SavedSearch } from '../types';
import { SortOrder } from '../angular/doc_table/components/table_header/helpers';
import { esFilters, TimeRange, Query } from '../../../../../../plugins/data/public';

export interface SearchInput extends EmbeddableInput {
  timeRange: TimeRange;
  query?: Query;
  filters?: esFilters.Filter[];
  hidePanelTitles?: boolean;
  columns?: string[];
  sort?: SortOrder[];
}

export interface SearchOutput extends EmbeddableOutput {
  editUrl: string;
  indexPatterns?: StaticIndexPattern[];
  editable: boolean;
}

export interface ISearchEmbeddable extends IEmbeddable<SearchInput, SearchOutput> {
  getSavedSearch(): SavedSearch;
}
