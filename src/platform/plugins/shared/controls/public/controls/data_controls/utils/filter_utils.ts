/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FetchContext } from '@kbn/presentation-publishing';

export const getFetchContextFilters = (fetchContext: FetchContext, useGlobalFilters?: boolean) => {
  if (!useGlobalFilters) {
    return fetchContext.filters?.filter(
      (currentFilter) => Boolean(currentFilter.meta.controlledBy) // filters without `controlledBy` are coming from unified search
    );
  }
  return fetchContext.filters;
};
