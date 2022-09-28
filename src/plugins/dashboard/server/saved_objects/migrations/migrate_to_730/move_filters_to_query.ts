/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, Query } from '@kbn/es-query';

export interface Pre600FilterQuery {
  // pre 6.0.0 global query:queryString:options were stored per dashboard and would
  // be applied even if the setting was subsequently removed from the advanced
  // settings. This is considered a bug, and this migration will fix that behavior.
  query: { query_string?: { query: string } & { [key: string]: unknown } };
}

export interface SearchSourcePre600 {
  // I encountered at least one export from 7.0.0-alpha that was missing the filter property in here.
  // The maps data in esarchives actually has it, but I don't know how/when they created it.
  filter?: Array<Filter | Pre600FilterQuery>;
}

export interface SearchSource730 {
  filter: Filter[];
  query: Query;
  highlightAll?: boolean;
  version?: boolean;
}

function isQueryFilter(filter: Filter | { query: unknown }): filter is Pre600FilterQuery {
  return filter.query !== undefined && !(filter as Filter).meta;
}

export function moveFiltersToQuery(
  searchSource: SearchSourcePre600 | SearchSource730
): SearchSource730 {
  const searchSource730: SearchSource730 = {
    ...searchSource,
    filter: [],
    query: (searchSource as SearchSource730).query || {
      query: '',
      language: 'kuery',
    },
  };

  // I encountered at least one export from 7.0.0-alpha that was missing the filter property in here.
  // The maps data in esarchives actually has it, but I don't know how/when they created it.
  if (!searchSource.filter) {
    searchSource.filter = [];
  }

  searchSource.filter.forEach((filter) => {
    if (isQueryFilter(filter)) {
      searchSource730.query = {
        query: filter.query.query_string ? filter.query.query_string.query : '',
        language: 'lucene',
      };
    } else {
      searchSource730.filter.push(filter);
    }
  });

  return searchSource730;
}
