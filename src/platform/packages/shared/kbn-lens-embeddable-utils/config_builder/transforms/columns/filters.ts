/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FiltersIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiFiltersOperation } from '../../schema/bucket_ops';
import { DEFAULT_FILTER, fromFilterLensStateToAPI } from './filter';
import { getLensAPIBucketSharedProps, getLensStateBucketSharedProps } from './utils';

export function fromFiltersLensApiToLensState(
  options: LensApiFiltersOperation
): FiltersIndexPatternColumn {
  const { filters, label } = options;

  const { sourceField, ...shared } = getLensStateBucketSharedProps({ label, field: '' });

  return {
    dataType: 'string',
    operationType: 'filters',
    ...shared,
    params: {
      filters: (filters ?? [])
        // do not propagate advanced filters within dimensions
        .filter((filter) => filter.filter.language != null)
        .map((filter) => ({
          input: filter.filter,
          label: filter.label ?? 'Filter',
        })),
    },
  };
}

export function fromFiltersLensStateToAPI(
  column: FiltersIndexPatternColumn
): LensApiFiltersOperation {
  const { label } = getLensAPIBucketSharedProps({ ...column, sourceField: '' });
  return {
    operation: 'filters',
    label,
    filters: column.params.filters.map((filter) => ({
      filter: fromFilterLensStateToAPI(filter.input) ?? DEFAULT_FILTER,
      ...(filter.label !== 'Filter' ? { label: filter.label } : {}),
    })),
  };
}
