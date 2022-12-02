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
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';

interface SearchBaseInput extends EmbeddableInput {
  timeRange: TimeRange;
  timeslice?: [number, number];
  query?: Query;
  filters?: Filter[];
  hidePanelTitles?: boolean;
  columns?: string[];
  sort?: SortOrder[];
  rowHeight?: number;
  rowsPerPage?: number;
}

export type SearchByValueInput = {
  attributes: SavedSearchAttributes;
} & SearchBaseInput;

export type SearchByReferenceInput = SavedObjectEmbeddableInput & SearchBaseInput;

export type SearchInput = SearchByValueInput | SearchByReferenceInput;

export interface SearchOutput extends EmbeddableOutput {
  indexPatterns?: DataView[];
  editable: boolean;
}

export interface ISearchEmbeddable extends IEmbeddable<SearchInput, SearchOutput> {
  getSavedSearch(): SavedSearch;
}

export interface SearchEmbeddable extends Embeddable<SearchInput, SearchOutput> {
  type: string;
}
