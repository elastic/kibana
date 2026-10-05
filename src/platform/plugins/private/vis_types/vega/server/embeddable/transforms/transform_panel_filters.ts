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
import type { VegaByValueState } from '../schema';

const toFilters = (storedFilters: StoredFilter[]): Filter[] =>
  storedFilters.map(({ $state, ...filter }) =>
    $state?.store ? { ...filter, $state: { store: $state.store } } : filter
  );

export const transformPanelFiltersIn = (
  filters: VegaByValueState['filters'],
  logger?: Logger
): { filters?: StoredFilter[]; references: SavedObjectReference[] } => {
  const storedFilters = toStoredFilters(filters, logger);
  if (!storedFilters?.length) return { filters: storedFilters, references: [] };

  const [{ filter }, references] = extractReferences({ filter: toFilters(storedFilters) });
  return { filters: filter, references };
};

export const transformPanelFiltersOut = (
  storedFilters: StoredFilter[] | undefined,
  references: SavedObjectReference[] = [],
  logger?: Logger
): VegaByValueState['filters'] => {
  if (!storedFilters?.length) return fromStoredFilters(storedFilters, logger);

  let filters = storedFilters;
  try {
    filters = injectReferences({ filter: toFilters(storedFilters) }, references).filter;
  } catch (error) {
    logger?.warn(`Unable to inject Vega panel filter references. Error: ${error.message}`);
  }
  return fromStoredFilters(filters, logger);
};
