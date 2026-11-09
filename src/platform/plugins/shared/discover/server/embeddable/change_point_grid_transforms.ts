/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, SavedObjectReference } from '@kbn/core/server';
import {
  fromStoredFilters,
  toStoredFilters,
  type StoredFilter,
} from '@kbn/as-code-filters-transforms';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { ChangePointGridEmbeddableState } from './change_point_grid_schema';

type StaticContext = NonNullable<ChangePointGridEmbeddableState['static_context']>;

/** Static filters are stored in the saved-filter shape so their data views become references. */
export type StoredChangePointGridState = Omit<ChangePointGridEmbeddableState, 'static_context'> & {
  static_context?: Omit<StaticContext, 'filters'> & { filters?: StoredFilter[] };
};

const toFilters = (storedFilters: StoredFilter[]): Filter[] =>
  storedFilters.map(({ $state, ...filter }) =>
    $state?.store ? { ...filter, $state: { store: $state.store } } : filter
  );

const transformFiltersIn = (
  filters: StaticContext['filters'],
  logger?: Logger
): { filters?: StoredFilter[]; references: SavedObjectReference[] } => {
  const storedFilters = toStoredFilters(filters, logger);
  if (!storedFilters?.length) return { filters: storedFilters, references: [] };

  const [{ filter }, references] = extractReferences({ filter: toFilters(storedFilters) });
  return { filters: filter, references };
};

const transformFiltersOut = (
  storedFilters: StoredFilter[] | undefined,
  references: SavedObjectReference[] = [],
  logger?: Logger
): StaticContext['filters'] => {
  if (!storedFilters?.length) return fromStoredFilters(storedFilters, logger);

  let filters = storedFilters;
  try {
    filters =
      injectReferences({ filter: toFilters(storedFilters) }, references).filter ?? storedFilters;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.warn(`Unable to inject change point grid panel filter references. Error: ${message}`);
  }
  return fromStoredFilters(filters, logger);
};

export const getChangePointGridTransforms = (logger?: Logger) => ({
  transformIn: (
    state: ChangePointGridEmbeddableState
  ): { state: StoredChangePointGridState; references: SavedObjectReference[] } => {
    const filters = state.static_context?.filters;
    if (!state.static_context || !filters?.length) {
      return { state: state as StoredChangePointGridState, references: [] };
    }

    const { filters: storedFilters, references } = transformFiltersIn(filters, logger);
    return {
      state: {
        ...state,
        static_context: { ...state.static_context, filters: storedFilters },
      },
      references,
    };
  },
  transformOut: (
    storedState: StoredChangePointGridState,
    panelReferences?: SavedObjectReference[]
  ): ChangePointGridEmbeddableState => {
    const filters = storedState.static_context?.filters;
    if (!storedState.static_context || !filters?.length) {
      return storedState as ChangePointGridEmbeddableState;
    }

    return {
      ...storedState,
      static_context: {
        ...storedState.static_context,
        filters: transformFiltersOut(filters, panelReferences, logger),
      },
    };
  },
});
