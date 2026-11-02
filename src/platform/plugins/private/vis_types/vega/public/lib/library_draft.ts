/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromStoredFilters, toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toAsCodeQuery, toStoredQuery } from '@kbn/as-code-shared-transforms';
import {
  COMPARE_ALL_OPTIONS,
  FilterStateStore,
  compareFilters,
  type Filter,
  type Query,
} from '@kbn/es-query';
import { isEqual } from 'lodash';
import type { VegaByValueState } from '../../server';
import { specFromEditor, specToEditorValue } from './editor_spec';

type VegaSpecFormat = VegaByValueState['spec']['format'];

/** The part of a Vega panel or library item that the editors change. */
export type VegaEditableState = Pick<VegaByValueState, 'spec' | 'query' | 'filters'>;

/** `VegaEditableState` in the form the editor works with, matching its query bar and code editor. */
export interface VegaDraft {
  /** The text in the spec editor. */
  spec: string;
  format: VegaSpecFormat;
  query?: Query;
  filters?: Filter[];
}

// `toStoredFilters` drops `$state`, and the filter editor ignores edits to filters without one.
export const toPanelFilters = (filters: VegaByValueState['filters']): Filter[] | undefined =>
  (toStoredFilters(filters) as Filter[] | undefined)?.map((filter) =>
    filter.$state?.store ? filter : { ...filter, $state: { store: FilterStateStore.APP_STATE } }
  );

export const toDraft = ({ spec, query, filters }: VegaEditableState): VegaDraft => ({
  spec: specToEditorValue(spec),
  format: spec.format,
  query: toStoredQuery(query),
  filters: toPanelFilters(filters),
});

export const fromDraft = ({ spec, format, query, filters }: VegaDraft): VegaEditableState => ({
  spec: specFromEditor(spec, format),
  query: toAsCodeQuery(query),
  filters: filters?.length ? fromStoredFilters(filters) : undefined,
});

/** Whether two drafts have the same spec text, query and filters. The spec format is ignored. */
export const isSameDraft = (left: VegaDraft, right: VegaDraft): boolean =>
  left.spec === right.spec &&
  isEqual(left.query, right.query) &&
  compareFilters(left.filters ?? [], right.filters ?? [], COMPARE_ALL_OPTIONS);
