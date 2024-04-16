/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ISearchSource } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { FetchContext } from '@kbn/presentation-publishing';
import type { SortOrder } from '@kbn/saved-search-plugin/public';

import { DiscoverServices } from '../../build_services';
import { getSortForSearchSource } from '../../utils/sorting';

export const updateSearchSource = (
  discoverServices: DiscoverServices,
  searchSource: ISearchSource,
  dataView: DataView | undefined,
  sort: (SortOrder[] & string[][]) | undefined,
  sampleSize: number,
  useNewFieldsApi: boolean,
  fetchContext: FetchContext,
  defaults: {
    sortDir: string;
  }
) => {
  const { sortDir } = defaults;
  searchSource.setField('size', sampleSize);
  searchSource.setField(
    'sort',
    getSortForSearchSource({
      sort,
      dataView,
      defaultSortDir: sortDir,
      includeTieBreaker: true,
    })
  );
  if (useNewFieldsApi) {
    searchSource.removeField('fieldsFromSource');
    const fields: Record<string, string> = { field: '*', include_unmapped: 'true' };
    searchSource.setField('fields', [fields]);
  } else {
    searchSource.removeField('fields');
  }

  // TODO: Make this better???
  // update parent search source
  const parentSearchSource = searchSource.getParent();
  parentSearchSource?.setField('filter', fetchContext.filters);
  parentSearchSource?.setField('query', fetchContext.query);

  const getTimeRangeFilter = () => {
    const timeRange =
      fetchContext.timeslice !== undefined
        ? {
            from: new Date(fetchContext.timeslice[0]).toISOString(),
            to: new Date(fetchContext.timeslice[1]).toISOString(),
            mode: 'absolute' as 'absolute',
          }
        : fetchContext.timeRange;

    if (!dataView || !timeRange) return;
    return discoverServices.timefilter.createFilter(dataView, timeRange);
  };
  const timeRangeFilter = getTimeRangeFilter();

  const filters = timeRangeFilter
    ? [timeRangeFilter, ...(fetchContext.filters ?? [])]
    : fetchContext.filters;
  parentSearchSource?.setField('filter', filters);
};
