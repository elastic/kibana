/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import {
  SerializedSearchSourceFields,
  TimefilterContract,
  DataPublicPluginStart,
} from 'src/plugins/data/public';

import { DataView } from '../../../data_views/public';

export async function createSearchSource(
  { create }: DataPublicPluginStart['search']['searchSource'],
  initialState: SerializedSearchSourceFields | null,
  indexPattern: DataView,
  aggs: any,
  useTimeFilter: boolean,
  filters: Filter[] = [],
  timefilter: TimefilterContract
) {
  const searchSource = await create(initialState || {});

  // Do not not inherit from rootSearchSource to avoid picking up time and globals
  searchSource.setParent(undefined);
  searchSource.setField('filter', () => {
    const activeFilters: Filter[] = [...filters];
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
