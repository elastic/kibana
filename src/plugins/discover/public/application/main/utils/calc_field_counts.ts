/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataTableRecord } from '../../../types';

/**
 * This function is calculating stats of the available fields, for usage in sidebar and sharing
 * Note that this values aren't displayed, but used for internal calculations
 */
export function calcFieldCounts(rows?: DataTableRecord[]) {
  const counts: Record<string, number> = {};
  if (!rows) {
    return {};
  }

  rows.forEach((hit) => {
    const fields = Object.keys(hit.flattened);
    fields.forEach((fieldName) => {
      counts[fieldName] = (counts[fieldName] || 0) + 1;
    });
  });

  return counts;
}
