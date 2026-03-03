/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNumericType } from '@kbn/esql-language';

/**
 * Casts a string value based on its ES|QL column type.
 * When columnType is available (from query results), uses the type to determine
 * if the value should be a number or string.
 * Falls back to heuristic-based detection for manual/static values.
 */
export const castESQLValue = (val: string, columnType?: string): string | number => {
  if (columnType) {
    return isNumericType(columnType) ? Number(val) : val;
  }
  return isNaN(Number(val)) ? val : Number(val);
};
