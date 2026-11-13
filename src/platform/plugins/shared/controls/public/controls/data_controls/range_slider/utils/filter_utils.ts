/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFilterableField } from '@kbn/data-source';
import { type Filter, type RangeFilterParams, buildRangeFilter } from '@kbn/es-query';
import type { RangeSliderControlState } from '@kbn/controls-schemas';
import type { FilterableSource } from '@kbn/data-source';

export const buildFilter = (
  dataView: FilterableSource,
  controlId: string,
  filterState: Pick<RangeSliderControlState, 'field_name' | 'value'> & { sectionId?: string }
) => {
  let rangeFilter: Filter | undefined;
  const fieldName = filterState.field_name
    ? findFilterableField(dataView, filterState.field_name)
    : undefined;
  const gte = parseFloat(filterState.value?.[0] ?? '');
  const lte = parseFloat(filterState.value?.[1] ?? '');

  if (filterState.value && dataView && fieldName && (!isNaN(gte) || !isNaN(lte))) {
    const params = {
      gte: !isNaN(gte) ? gte : -Infinity,
      lte: !isNaN(lte) ? lte : Infinity,
    } as RangeFilterParams;

    rangeFilter = buildRangeFilter(fieldName, params, dataView);
    if (rangeFilter) {
      rangeFilter.meta.key = filterState.field_name;
      rangeFilter.meta.type = 'range';
      rangeFilter.meta.params = params;
      rangeFilter.meta.controlledBy = controlId;
      if (filterState.sectionId) rangeFilter.meta.group = filterState.sectionId;
    }
  }
  return rangeFilter;
};
