/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { DimensionFilters } from '@kbn/metrics-experience-plugin/common/types';
import { FIELD_VALUE_SEPARATOR } from '../common/constants';

export const useDimensionFilters = (valueFilters?: string[]) => {
  return useMemo(() => {
    if (!valueFilters?.length) {
      return { filters: undefined };
    }

    const filters: DimensionFilters = {};

    valueFilters.forEach((filter) => {
      const [field, value] = filter.split(FIELD_VALUE_SEPARATOR);
      if (field !== '') {
        if (!filters[field]) {
          filters[field] = [];
        }
        filters[field].push(value);
      }
    });

    return { filters };
  }, [valueFilters]);
};
