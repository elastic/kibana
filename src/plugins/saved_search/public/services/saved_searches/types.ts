/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EmbeddableInput, SavedObjectEmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { Reference } from '@kbn/content-management-utils';
import type { SortOrder } from '@kbn/saved-search/types';
import type { SavedSearchAttributes } from '../../../common';
export type { SavedSearch } from '@kbn/saved-search/types';

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
  sampleSize?: number;
}

export type SavedSearchByValueAttributes = Omit<SavedSearchAttributes, 'description'> & {
  description?: string;
  references: Reference[];
};

export type SearchByValueInput = {
  attributes: SavedSearchByValueAttributes;
} & SearchBaseInput;

export type SearchByReferenceInput = SavedObjectEmbeddableInput & SearchBaseInput;
