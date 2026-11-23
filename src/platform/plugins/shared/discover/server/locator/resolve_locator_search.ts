/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { ISearchSource } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { getSavedSearch } from '@kbn/saved-search-plugin/server';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';

export interface ResolvedLocatorSearch {
  /** The saved search referenced by the params, if any. */
  savedSearch: SavedSearch | undefined;
  /** The data view the search runs against. */
  dataView: DataView;
  /** A search source (copy) with the `index` field set to `dataView`. */
  searchSource: ISearchSource;
}

const isString = (value: unknown): value is string => typeof value === 'string';

const isSortOrderPair = (item: unknown): boolean =>
  Array.isArray(item) &&
  item.length === 2 &&
  typeof item[0] === 'string' &&
  (item[1] === 'asc' || item[1] === 'desc');

/**
 * The locator params of a report job are not validated beyond being a record, so the fields
 * that are used to build the request are validated here. An invalid value fails the report: skipping
 * it would silently export more data than requested, for example without a time range filter.
 */
const validateParams = ({ columns, sort, timeRange }: DiscoverAppLocatorParams): void => {
  if (columns !== undefined && !(Array.isArray(columns) && columns.every(isString))) {
    throw new Error('Invalid DiscoverAppLocatorParams: "columns" must be an array of strings');
  }

  if (timeRange !== undefined && !(isString(timeRange?.from) && isString(timeRange?.to))) {
    throw new Error(
      'Invalid DiscoverAppLocatorParams: "timeRange" must have a "from" and a "to" string'
    );
  }

  if (sort !== undefined && !(Array.isArray(sort) && sort.every(isSortOrderPair))) {
    throw new Error(
      'Invalid DiscoverAppLocatorParams: "sort" must be an array of [field, "asc" | "desc"] pairs'
    );
  }
};

/**
 * Resolves the saved search, data view and a base search source from DiscoverAppLocatorParams.
 *
 * - `savedSearchId`: the saved search provides the base search source and data view.
 * - `dataViewId`: the data view is loaded by id. When combined with `savedSearchId`, it takes
 *   precedence over the saved search's data view. This is expected: Discover sends both when the data
 *   view of a saved session was changed in the UI. Columns that don't exist in it are still requested
 *   (`include_unmapped`).
 *
 * Ad hoc data views (`dataViewSpec` only) are not supported on the server.
 * @internal
 */
export const resolveLocatorSearch = async (
  services: LocatorServicesDeps,
  params: DiscoverAppLocatorParams
): Promise<ResolvedLocatorSearch> => {
  const { savedSearchId, dataViewId } = params;

  if (!savedSearchId && !dataViewId) {
    throw new Error(
      'DiscoverAppLocatorParams must contain a saved search reference (savedSearchId) or a data view reference (dataViewId)'
    );
  }

  validateParams(params);

  try {
    const savedSearch = savedSearchId ? await getSavedSearch(savedSearchId, services) : undefined;
    const searchSource = savedSearch
      ? savedSearch.searchSource.createCopy()
      : await services.searchSourceStart.create();

    let dataView = searchSource.getField('index');

    if (dataViewId && dataView?.id !== dataViewId) {
      dataView = await services.dataViewsService.get(dataViewId);
      searchSource.setField('index', dataView);
    }

    if (!dataView) {
      throw new Error(`Search Source is missing the "index" field`);
    }

    return { savedSearch, dataView, searchSource };
  } catch (error) {
    // Boom errors (for example a saved object that is not found, or is forbidden) are rethrown as they
    // are, to keep their status code. Their message already names the object.
    if (Boom.isBoom(error)) {
      throw error;
    }

    const context = [
      savedSearchId && `savedSearchId: ${savedSearchId}`,
      dataViewId && `dataViewId: ${dataViewId}`,
    ]
      .filter(Boolean)
      .join(', ');
    const reason = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to resolve the search from DiscoverAppLocatorParams (${context}): ${reason}`,
      { cause: error }
    );
  }
};
