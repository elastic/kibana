/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { FIELD_VALUE_SEPARATOR } from '../common/constants';

export const useValueFilters = (valueFilters?: string[]) => {
  return useMemo(() => {
    if (!valueFilters?.length) {
      return [];
    }

    return valueFilters
      .map((selectedValue) => {
        const [field, value] = selectedValue.split(FIELD_VALUE_SEPARATOR);
        return { field, value };
      })
      .filter((filter) => filter.field !== '');
  }, [valueFilters]);
};
