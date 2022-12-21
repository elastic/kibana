/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryStart, SavedQuery } from '@kbn/data-plugin/public';

export const populateStateFromSavedQuery = (queryService: QueryStart, savedQuery: SavedQuery) => {
  const {
    timefilter: { timefilter },
    filterManager,
    queryString,
  } = queryService;
  // timefilter
  if (savedQuery.attributes.timefilter) {
    timefilter.setTime({
      from: savedQuery.attributes.timefilter.from,
      to: savedQuery.attributes.timefilter.to,
    });
    if (savedQuery.attributes.timefilter.refreshInterval) {
      timefilter.setRefreshInterval(savedQuery.attributes.timefilter.refreshInterval);
    }
  }

  // query string
  queryString.setQuery(savedQuery.attributes.query);

  // filters
  const savedQueryFilters = savedQuery.attributes.filters || [];
  const globalFilters = filterManager.getGlobalFilters();
  filterManager.setFilters([...globalFilters, ...savedQueryFilters]);
};
