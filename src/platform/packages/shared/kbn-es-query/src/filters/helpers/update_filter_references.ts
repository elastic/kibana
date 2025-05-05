/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter } from '..';

export function updateFilterReferences(
  filters: Filter[],
  fromDataView: string,
  toDataView: string | undefined
) {
  return (filters || []).map((filter) => {
    if (filter.meta.index === fromDataView) {
      return {
        ...filter,
        meta: {
          ...filter.meta,
          index: toDataView,
        },
      };
    } else {
      return filter;
    }
  });
}
