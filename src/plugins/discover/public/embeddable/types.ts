/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Embeddable, EmbeddableOutput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  SavedSearch,
  SearchByReferenceInput,
  SearchByValueInput,
} from '@kbn/saved-search-plugin/public';

export type SearchInput = SearchByValueInput | SearchByReferenceInput;

export interface SearchOutput extends EmbeddableOutput {
  indexPatterns?: DataView[];
  editable: boolean;
}

export interface ISearchEmbeddable extends IEmbeddable<SearchInput, SearchOutput> {
  getSavedSearch(): SavedSearch;
  hasTimeRange(): boolean;
}

export interface SearchEmbeddable extends Embeddable<SearchInput, SearchOutput> {
  type: string;
}
