/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DimensionValueFilters } from '../../types';
import { FIELD_VALUE_SEPARATOR } from '../constants';

/**
 * Parses value filters into dimension filters and metric field keys.
 */
export const parseDimensionFilters = (valueFilters?: string[]) => {
  if (!valueFilters?.length) {
    return undefined;
  }

  const filters: DimensionValueFilters = {};

  for (const filter of valueFilters) {
    const [field, value] = filter.split(FIELD_VALUE_SEPARATOR);
    if (field !== '') {
      if (!filters[field]) {
        filters[field] = [];
      }
      filters[field].push(value);
    }
  }

  return filters;
};
