/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for extracting and injecting data view references of AsCodeFilters
 * persisted in their as code shape.
 */

import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { Reference } from '@kbn/content-management-utils';
import type { StoredAsCodeFilter } from './types';

const DATA_VIEW_SAVED_OBJECT_TYPE = 'index-pattern'; // cannot import from plugin @kbn/data-views-plugin/common

/**
 * Replaces the `data_view_id` of each filter with a `data_view_ref_name` and returns the data view references.
 */
export function extractFilterReferences(
  filters: AsCodeFilter[] | undefined,
  options?: { refNamePrefix?: string }
): { filters?: StoredAsCodeFilter[]; references: Reference[] } {
  if (!filters) {
    return { filters, references: [] };
  }

  const refNamePrefix = options?.refNamePrefix ? `${options.refNamePrefix}.` : '';
  const references: Reference[] = [];
  const storedFilters = filters.map((filter, index) => {
    const { data_view_id: dataViewId, ...rest } = filter;
    if (!dataViewId) {
      return rest;
    }
    const refName = `${refNamePrefix}filters[${index}].data_view_id`;
    references.push({ name: refName, type: DATA_VIEW_SAVED_OBJECT_TYPE, id: dataViewId });
    return { ...rest, data_view_ref_name: refName };
  });

  return { filters: storedFilters, references };
}

function injectFilterReference(
  filter: StoredAsCodeFilter,
  references: Reference[] = []
): AsCodeFilter {
  const { data_view_ref_name: refName, ...rest } = filter;
  if (!refName) {
    return rest;
  }
  const reference = references.find(({ name }) => name === refName);
  if (!reference) {
    throw new Error(`Could not find reference for ${refName}`);
  }
  return { ...rest, data_view_id: reference.id };
}

/**
 * Restores the `data_view_id` of each filter from its `data_view_ref_name`.
 * Throws when a referenced name is not found in `references`.
 */
export function injectFilterReferences(
  filters: StoredAsCodeFilter[] | undefined,
  references: Reference[] = []
): AsCodeFilter[] | undefined {
  return filters?.map((filter) => injectFilterReference(filter, references));
}
