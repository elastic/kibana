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
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { EsQuerySortValue } from '@kbn/data-plugin/common';
import { getSavedSearch } from '@kbn/saved-search-plugin/server';
import {
  SORT_DEFAULT_ORDER_SETTING,
  getSortForSearchSource,
  type SortOrder,
} from '@kbn/discover-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
import { processSavedSearchColumns, shouldIncludeTimeField } from './columns_from_locator';

// Shortcut for return type of searchSource.getField('filter');
type FilterResponse = undefined | Filter | Filter[] | (() => Filter | Filter[] | undefined);

// flattens filter objects coming from different sources
function normalizeFilter(savedSearchFilterTmp?: FilterResponse) {
  let savedSearchFilter: Filter[] | undefined;

  if (!savedSearchFilterTmp) {
    return undefined;
  }

  if (Array.isArray(savedSearchFilterTmp)) {
    // Filter out functions and invalid filters
    savedSearchFilter = savedSearchFilterTmp
      .filter((f) => typeof f !== 'function' && f !== null && f !== undefined)
      .map((f) => ({ ...f })); // Create shallow copy to avoid mutations
  } else if (typeof savedSearchFilterTmp !== 'function') {
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
  locatorParams: DiscoverAppLocatorParams,
  searchSource: ISearchSource,
  savedSearch?: { timeRange?: TimeRange; filters?: Filter[] }
) => {
  if (!index?.id) {
    throw new Error('Data view must have a valid ID');
  }

  const filters: Filter[] = [];

  // Set a time range filter from (1) DiscoverAppLocatorParams or (2) SavedSearch
  if (timeFieldName) {
    let timeRange: TimeRange | undefined;
    if (locatorParams.timeRange) {
      timeRange = locatorParams.timeRange;
    } else if (savedSearch?.timeRange) {
      timeRange = savedSearch.timeRange as TimeRange;
    }

    if (timeRange?.from && timeRange?.to) {
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
  const paramsFilter = normalizeFilter(locatorParams.filters);
  if (paramsFilter) {
    filters.push(...paramsFilter);
  }

  return filters;
};

/*
 * Pick the query from the job request body vs any query that has been saved into the saved search object.
 */
const getQuery = (searchSource: ISearchSource, locatorParams: DiscoverAppLocatorParams) => {
  let query: Query | AggregateQuery | undefined;
  const paramsQuery = locatorParams.query;
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
   * Creates a search source from a saved search
   */
  const createSearchSourceFromSavedSearch = async (
    savedSearchId: string
  ): Promise<{
    searchSource: ISearchSource;
    dataView: DataView;
    timeFieldName: string | undefined;
    columns: string[] | undefined;
    savedSearch: SavedSearch;
  }> => {
    if (!savedSearchId) {
      throw new Error('savedSearchId is required');
    }

    const savedSearch = await getSavedSearch(savedSearchId, services);
    if (!savedSearch) {
      throw new Error(`Saved search with id "${savedSearchId}" not found`);
    }

    const searchSource = savedSearch.searchSource.createCopy();
    if (!searchSource) {
      throw new Error(`Failed to create copy of search source for saved search "${savedSearchId}"`);
    }

    const dataView = searchSource.getField('index') as DataView;
    if (!dataView) {
      throw new Error(`Saved search with id "${savedSearchId}" does not have a data view.`);
    }

    const timeFieldName = await shouldIncludeTimeField(services, dataView);
    const columns = await processSavedSearchColumns(services, dataView, savedSearch);

    return { searchSource, dataView, timeFieldName, columns, savedSearch };
  };

  /**
   * Creates a new search source from data view details
   */
  const createSearchSourceFromDataView = async (
    locatorParams: DiscoverAppLocatorParams
  ): Promise<{
    searchSource: ISearchSource;
    dataView: DataView;
    timeFieldName: string | undefined;
    columns: string[] | undefined;
    savedSearch: undefined;
  }> => {
    if (!locatorParams.dataViewId) {
      throw new Error('dataViewId is required when not using savedSearchId');
    }

    const dataView = await services.dataViewsService.get(locatorParams.dataViewId);
    if (!dataView) {
      throw new Error(`Data view with id "${locatorParams.dataViewId}" not found`);
    }

    const searchSource = await services.searchSourceStart.create();
    if (!searchSource) {
      throw new Error('Failed to create search source from services');
    }

    searchSource.setField('index', dataView);

    // Get fresh data view details for consistency
    const timeFieldName = await shouldIncludeTimeField(services, dataView);
    const columns = await processSavedSearchColumns(services, dataView, {});

    return { searchSource, dataView, timeFieldName, columns, savedSearch: undefined };
  };

  /**
   * Configures the search source with columns
   */
  const configureSearchSourceFields = (
    columns: string[] | undefined
  ): Array<{ field: string; include_unmapped: true }> => {
    if (columns && columns.length > 0) {
      // Validate that all columns are strings
      if (!columns.every((col) => typeof col === 'string')) {
        throw new Error('All columns must be strings');
      }
      return columns.map((col) => ({ field: col, include_unmapped: true }));
    } else {
      return [{ field: '*', include_unmapped: true }];
    }
  };

  /**
   * Configures the search source with filters
   */
  const configureSearchSourceFilters = (
    searchSource: ISearchSource,
    timeFieldName: string | undefined,
    dataView: DataView,
    locatorParams: DiscoverAppLocatorParams,
    savedSearch?: SavedSearch
  ): Filter[] => {
    if (!searchSource) {
      throw new Error('searchSource is required');
    }
    if (!dataView) {
      throw new Error('dataView is required');
    }
    if (!locatorParams) {
      throw new Error('locatorParams is required');
    }

    const filters = getFilters(timeFieldName, dataView, locatorParams, searchSource, savedSearch);
    return filters;
  };

  /**
   * Configures the search source with query
   */
  const configureSearchSourceQuery = (
    searchSource: ISearchSource,
    locatorParams: DiscoverAppLocatorParams
  ): Query | AggregateQuery | undefined => {
    if (!searchSource) {
      throw new Error('searchSource is required');
    }
    if (!locatorParams) {
      throw new Error('locatorParams is required');
    }

    const query = getQuery(searchSource, locatorParams);
    return query;
  };

  /**
   * Configures the search source with sorting
   */
  const configureSearchSourceSort = async (
    locatorParams: DiscoverAppLocatorParams,
    dataView: DataView,
    savedSearch?: SavedSearch
  ): Promise<EsQuerySortValue[] | undefined> => {
    // Early return if no sorting is needed
    if (!locatorParams.sort && !savedSearch?.sort) {
      return undefined;
    }

    // Get the sort configuration from either locator params or saved search
    const sort = locatorParams.sort || savedSearch?.sort;

    // Validate sort format
    if (!Array.isArray(sort) || sort.length === 0) {
      throw new Error('Invalid sort format: must be a non-empty array');
    }

    // Validate each sort item has exactly 2 elements
    for (const [index, sortItem] of sort.entries()) {
      if (!Array.isArray(sortItem) || sortItem.length !== 2) {
        throw new Error(`Invalid sort item at index ${index}: must be [field, direction]`);
      }
      if (typeof sortItem[0] !== 'string' || typeof sortItem[1] !== 'string') {
        throw new Error(`Invalid sort item at index ${index}: field and direction must be strings`);
      }
      if (!['asc', 'desc'].includes(sortItem[1])) {
        throw new Error(`Invalid sort direction at index ${index}: must be 'asc' or 'desc'`);
      }
    }

    const defaultSortDir = await services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING);

    return getSortForSearchSource({
      sort: sort as SortOrder[],
      dataView,
      defaultSortDir,
    });
  };

  /**
   * Allows consumers to transform DiscoverAppLocatorParams into a SearchSource object for querying.
   *
   * @public
   */
  const searchSourceFromLocator = async (
    locatorParams: DiscoverAppLocatorParams
  ): Promise<ISearchSource> => {
    // Add input validation
    if (!locatorParams) {
      throw new Error('locatorParams is required');
    }

    if (!locatorParams.savedSearchId && !locatorParams.dataViewId) {
      throw new Error('Either savedSearchId or dataViewId must be provided');
    }

    try {
      // Create search source and get basic configuration
      const {
        searchSource,
        dataView,
        timeFieldName,
        columns: storedColumns,
        savedSearch,
      } = locatorParams.savedSearchId
        ? await createSearchSourceFromSavedSearch(locatorParams.savedSearchId)
        : await createSearchSourceFromDataView(locatorParams);

      // Validate critical dependencies
      if (!searchSource) {
        throw new Error('Failed to create search source');
      }
      if (!dataView) {
        throw new Error('Failed to retrieve data view');
      }

      // Determine columns from locatorParams (unsaved) or use stored columns (saved search)
      const columns = locatorParams.columns ?? storedColumns;
      // Configure all aspects of the search source with individual error handling
      const fields = configureSearchSourceFields(columns);
      searchSource.setField('fields', fields);

      const filters = configureSearchSourceFilters(
        searchSource,
        timeFieldName,
        dataView,
        locatorParams,
        savedSearch
      );
      if (filters.length > 0) {
        searchSource.removeField('filter');
        searchSource.setField('filter', filters);
      }

      const query = configureSearchSourceQuery(searchSource, locatorParams);
      if (query) {
        searchSource.removeField('query');
        searchSource.setField('query', query);
      }

      const sort = await configureSearchSourceSort(locatorParams, dataView, savedSearch);

      if (sort) {
        searchSource.removeField('sort');
        searchSource.setField('sort', sort);
      }

      return searchSource;
    } catch (error) {
      // Provide more context in error messages
      const context = locatorParams.savedSearchId
        ? `savedSearchId: ${locatorParams.savedSearchId}`
        : `dataViewId: ${locatorParams.dataViewId}`;
      throw new Error(`Failed to create search source from locator (${context}): ${error.message}`);
    }
  };

  return searchSourceFromLocator;
}

export type SearchSourceFromLocatorFn = ReturnType<typeof searchSourceFromLocatorFactory>;
