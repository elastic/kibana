/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchSource, TimeRange } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query, RangeFilter } from '@kbn/es-query';
import {
  SORT_DEFAULT_ORDER_SETTING,
  getSortForSearchSource,
  isNestedFieldParent,
} from '@kbn/discover-utils';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
import { getColumns } from './columns_from_locator';
import { resolveLocatorSearch } from './resolve_locator_search';

// Shortcut for return type of searchSource.getField('filter');
type FilterResponse = undefined | Filter | Filter[] | (() => Filter | Filter[] | undefined);

// flattens filter objects coming from different sources
function normalizeFilter(savedSearchFilterTmp?: FilterResponse) {
  if (!savedSearchFilterTmp) {
    return undefined;
  }

  if (Array.isArray(savedSearchFilterTmp)) {
    // can not include functions: could be recursive
    return savedSearchFilterTmp.filter((f) => f && typeof f !== 'function').map((f) => ({ ...f })); // shallow copy to avoid mutating the source filters
  }

  if (typeof savedSearchFilterTmp !== 'function') {
    return [{ ...savedSearchFilterTmp }];
  }

  return undefined;
}

/*
 * Combine the time range filter from the job request body with any filters that have been saved into the saved search object
 * NOTE: if the filters that were saved into the search are NOT an array, it may be a function, and can not be supported.
 */
const getFilters = (
  timeFieldName: string | undefined,
  index: DataView,
  savedSearchTimeRange: TimeRange | undefined,
  searchSource: ISearchSource,
  params: DiscoverAppLocatorParams
) => {
  const filters: Filter[] = [];

  // Set a time range filter from (1) DiscoverAppLocatorParams or (2) SavedSearch
  if (timeFieldName) {
    const timeRange = params.timeRange ?? savedSearchTimeRange;

    if (timeRange) {
      // `meta.field` identifies the time filter: `overrideTimeRange` (@kbn/generate-csv) looks for it to
      // re-anchor a relative range to `forceNow`, which reporting sets when it runs a scheduled report.
      const timeRangeFilter: RangeFilter = {
        meta: { index: index.id, field: timeFieldName, params: {}, type: 'range' },
        query: {
          range: {
            [timeFieldName]: {
              format: 'strict_date_optional_time',
              gte: timeRange.from,
              lte: timeRange.to,
            },
          },
        },
      };
      filters.push(timeRangeFilter);
    }
  }

  const savedSearchFilter = normalizeFilter(searchSource.getField('filter'));
  if (savedSearchFilter) {
    filters.push(...savedSearchFilter);
  }
  const paramsFilter = normalizeFilter(params.filters);
  if (paramsFilter) {
    filters.push(...paramsFilter);
  }

  return filters;
};

/*
 * Pick the query from the job request body vs any query that has been saved into the saved search object.
 */
const getQuery = (searchSource: ISearchSource, params: DiscoverAppLocatorParams) => {
  let query: Query | AggregateQuery | undefined;
  const paramsQuery = params.query;
  const savedSearchQuery = searchSource.getField('query');
  if (paramsQuery) {
    query = paramsQuery;
  } else if (savedSearchQuery) {
    // NOTE: cannot combine 2 queries (using AND): query can not be an array in SearchSourceFields
    query = savedSearchQuery;
  }

  return query;
};

/**
 * @internal
 */
export function searchSourceFromLocatorFactory(services: LocatorServicesDeps) {
  /**
   * Allows consumers to transform DiscoverAppLocatorParams into a SearchSource object for querying.
   *
   * @public
   */
  const searchSourceFromLocator = async (
    params: DiscoverAppLocatorParams
  ): Promise<ISearchSource> => {
    const {
      savedSearch,
      dataView: index,
      searchSource,
    } = await resolveLocatorSearch(services, params);

    // columns in the locator params (current state) take precedence over the saved search
    const columnsSource = params.columns?.length ? params.columns : savedSearch?.columns;
    const { columns, timeFieldName } = await getColumns(services, index, {
      columns: columnsSource,
    });

    // Inject columns, the same way as the Discover UI does when it builds the search source for reports:
    // unmapped fields are included and nested field roots are expanded to their leaf fields.
    searchSource.setField(
      'fields',
      columns?.length
        ? columns.map((column) => ({
            field: isNestedFieldParent(column, index) ? `${column}.*` : column,
            include_unmapped: true,
          }))
        : [{ field: '*', include_unmapped: true }]
    );

    // Inject updated filters
    const filters = getFilters(
      timeFieldName,
      index,
      savedSearch?.timeRange as TimeRange | undefined,
      searchSource,
      params
    );
    if (filters.length > 0) {
      searchSource.removeField('filter');
      searchSource.setField('filter', filters);
    }

    // Inject query
    const query = getQuery(searchSource, params);
    if (query) {
      searchSource.removeField('query');
      searchSource.setField('query', query);
    }

    // Inject sort: locator params (current state) take precedence over the saved search.
    // Unlike the columns, an explicit empty sort is kept on purpose: it means the sort was cleared,
    // so the default sort applies instead of the one of the saved search (same as the Discover UI).
    const defaultSortDir = await services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING);
    const sort = getSortForSearchSource({
      sort: (params.sort ?? savedSearch?.sort) as Array<[string, string]> | undefined,
      dataView: index,
      defaultSortDir,
    });
    searchSource.setField('sort', sort);

    return searchSource;
  };
  return searchSourceFromLocator;
}

export type SearchSourceFromLocatorFn = ReturnType<typeof searchSourceFromLocatorFactory>;
