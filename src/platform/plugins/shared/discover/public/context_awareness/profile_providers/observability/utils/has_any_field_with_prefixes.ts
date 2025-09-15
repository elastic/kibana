/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';

export const hasAnyFieldWithPrefixes = (prefixes: string[]) => {
  return (record: DataTableRecord): boolean => {
    const data = record.flattened;

    for (const prefix of prefixes) {
      for (const key in data) {
        if (key.startsWith(prefix) && data[key] != null) {
          return true;
        }
      }
    }

    return false;
  };
};
