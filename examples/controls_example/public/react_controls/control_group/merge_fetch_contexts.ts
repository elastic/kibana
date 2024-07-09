/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChainingContext, DataControlFetchContext } from "./types";

export function mergeFetchContexts(controlGroupFetchContext: DataControlFetchContext, chainingContext: ChainingContext) {
  const filters = [];
  if (controlGroupFetchContext.unifiedSearchFilters) {
    filters.push(...controlGroupFetchContext.unifiedSearchFilters);
  }
  if (chainingContext.chainingFilters) {
    filters.push(...chainingContext.chainingFilters);
  }

  return {
    filters,
    query: controlGroupFetchContext.query,
    timeRange: chainingContext.timeRange ?? controlGroupFetchContext.timeRange,
  };
}