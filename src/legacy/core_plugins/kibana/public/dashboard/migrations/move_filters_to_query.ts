/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Filter, Query } from '../../../../../../plugins/data/public';

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
  return filter.query && !(filter as Filter).meta;
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

  searchSource.filter.forEach(filter => {
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
