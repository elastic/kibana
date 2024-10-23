/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchSource, TimeRange } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { SavedSearch } from '@kbn/saved-search-plugin/common';
import { getSavedSearch } from '@kbn/saved-search-plugin/server';
import { SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { LocatorServicesDeps } from '.';
import { DiscoverAppLocatorParams } from '../../common';
import { getSortForSearchSource } from '../../common/utils/sorting';
import { getColumns } from './columns_from_locator';

// Shortcut for return type of searchSource.getField('filter');
type FilterResponse = undefined | Filter | Filter[] | (() => Filter | Filter[] | undefined);

// flattens filter objects coming from different sources
function normalizeFilter(savedSearchFilterTmp?: FilterResponse) {
  let savedSearchFilter: Filter[] | undefined;
  if (savedSearchFilterTmp && Array.isArray(savedSearchFilterTmp)) {
    // can not include functions: could be recursive
    savedSearchFilter = [...savedSearchFilterTmp.filter((f) => typeof f !== 'function')];
  } else if (savedSearchFilterTmp && typeof savedSearchFilterTmp !== 'function') {
    savedSearchFilter = [savedSearchFilterTmp];
  }
  return savedSearchFilter;
}

/*
 * Combine the time range filter from the job request body with any filters that have been saved into the saved search object
 * NOTE: if the filters that were saved into the search are NOT an array, it may be a function, and can not be supported.
 */
const getFilters = (
  timeFieldName: string | undefined,
  index: DataView,
  savedSearch: SavedSearch,
  searchSource: SearchSource,
  params: DiscoverAppLocatorParams
) => {
  const filters: Filter[] = [];

  // Set a time range filter from (1) DiscoverAppLocatorParams or (2) SavedSearch
  if (timeFieldName) {
    const timeRange = params.timeRange
      ? params.timeRange
      : savedSearch.timeRange
      ? (savedSearch.timeRange as TimeRange)
      : null;

    if (timeRange) {
      filters.push({
        meta: { index: index.id },
        query: {
          range: {
            [timeFieldName]: {
              format: 'strict_date_optional_time',
              gte: timeRange.from,
              lte: timeRange.to,
            },
          },
        },
      });
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
const getQuery = (searchSource: SearchSource, params: DiscoverAppLocatorParams) => {
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
  ): Promise<SearchSource> => {
    if (!params.savedSearchId) {
      throw new Error(`Saved Search ID is required in DiscoverAppLocatorParams`);
    }

    const savedSearch = await getSavedSearch(params.savedSearchId, services);

    const searchSource = savedSearch.searchSource.createCopy();
    const index = searchSource.getField('index');

    if (!index) {
      throw new Error(`Search Source is missing the "index" field`);
    }

    const { columns, timeFieldName } = await getColumns(services, index, savedSearch);

    // Inject columns
    if (columns) {
      searchSource.setField('fields', columns);
    } else {
      searchSource.setField('fields', ['*']);
    }

    // Inject updated filters
    const filters = getFilters(timeFieldName, index, savedSearch, searchSource, params);
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

    // Inject sort
    if (savedSearch.sort) {
      const defaultSortDir = await services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING);

      const sort = getSortForSearchSource({
        sort: savedSearch.sort as Array<[string, string]>,
        dataView: index,
        defaultSortDir,
      });
      searchSource.setField('sort', sort);
    }

    return searchSource;
  };
  return searchSourceFromLocator;
}

export type SearchSourceFromLocatorFn = ReturnType<typeof searchSourceFromLocatorFactory>;
