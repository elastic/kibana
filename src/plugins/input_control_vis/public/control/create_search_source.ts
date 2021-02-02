/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  SearchSourceFields,
  PhraseFilter,
  IndexPattern,
  TimefilterContract,
  DataPublicPluginStart,
} from 'src/plugins/data/public';

export async function createSearchSource(
  { create }: DataPublicPluginStart['search']['searchSource'],
  initialState: SearchSourceFields | null,
  indexPattern: IndexPattern,
  aggs: any,
  useTimeFilter: boolean,
  filters: PhraseFilter[] = [],
  timefilter: TimefilterContract
) {
  const searchSource = await create(initialState || {});

  // Do not not inherit from rootSearchSource to avoid picking up time and globals
  searchSource.setParent(undefined);
  searchSource.setField('filter', () => {
    const activeFilters = [...filters];
    if (useTimeFilter) {
      const filter = timefilter.createFilter(indexPattern);
      if (filter) {
        activeFilters.push(filter);
      }
    }
    return activeFilters;
  });
  searchSource.setField('size', 0);
  searchSource.setField('index', indexPattern);
  searchSource.setField('aggs', aggs);
  return searchSource;
}
