/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EmbeddableInput, SavedObjectEmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { ResolvedSimpleSavedObject } from '@kbn/core/public';
import type { Reference } from '@kbn/content-management-utils';
import type { SortOrder } from '../..';
import type { SavedSearchAttributes } from '../../../common';
import type { SavedSearch as SavedSearchCommon } from '../../../common';

/** @public **/
export interface SavedSearch extends SavedSearchCommon {
  sharingSavedObjectProps?: {
    outcome?: ResolvedSimpleSavedObject['outcome'];
    aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
    aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
    errorJSON?: string;
  };
}

interface SearchBaseInput extends EmbeddableInput {
  timeRange: TimeRange;
  timeslice?: [number, number];
  query?: Query;
  filters?: Filter[];
  hidePanelTitles?: boolean;
  columns?: string[];
  sort?: SortOrder[];
  rowHeight?: number;
  headerRowHeight?: number;
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
