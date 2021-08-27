/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Filter } from '../../../../data/common/es_query';
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { TimeRange } from '../../../../data/common/query/timefilter/types';
import type { Query } from '../../../../data/public';
import type { EmbeddableInput } from '../../../../embeddable/common/types';
import { Embeddable } from '../../../../embeddable/public/lib/embeddables/embeddable';
import type {
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../embeddable/public/lib/embeddables/i_embeddable';
import type { SavedSearch } from '../../saved_searches/types';
import type { SortOrder } from '../apps/main/components/doc_table/components/table_header/helpers';

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
  indexPatterns?: IndexPattern[];
  editable: boolean;
}

export interface ISearchEmbeddable extends IEmbeddable<SearchInput, SearchOutput> {
  getSavedSearch(): SavedSearch;
}

export interface SearchEmbeddable extends Embeddable<SearchInput, SearchOutput> {
  type: string;
}
