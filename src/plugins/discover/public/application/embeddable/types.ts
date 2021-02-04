/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from 'src/plugins/embeddable/public';
import { SortOrder } from '../angular/doc_table/components/table_header/helpers';
import { Filter, IIndexPattern, TimeRange, Query } from '../../../../data/public';
import { SavedSearch } from '../..';

export interface SearchInput extends EmbeddableInput {
  timeRange: TimeRange;
  query?: Query;
  filters?: Filter[];
  hidePanelTitles?: boolean;
  columns?: string[];
  sort?: SortOrder[];
}

export interface SearchOutput extends EmbeddableOutput {
  editUrl: string;
  indexPatterns?: IIndexPattern[];
  editable: boolean;
}

export interface ISearchEmbeddable extends IEmbeddable<SearchInput, SearchOutput> {
  getSavedSearch(): SavedSearch;
}

export interface SearchEmbeddable extends Embeddable<SearchInput, SearchOutput> {
  type: string;
}
