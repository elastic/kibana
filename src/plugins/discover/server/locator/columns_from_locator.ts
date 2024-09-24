/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/common';
import { getSavedSearch } from '@kbn/saved-search-plugin/server';
import { DOC_HIDE_TIME_COLUMN_SETTING, SEARCH_FIELDS_FROM_SOURCE } from '@kbn/discover-utils';
import { LocatorServicesDeps } from '.';
import { DiscoverAppLocatorParams } from '../../common';

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

/**
 * @internal
 */
export const getColumns = async (
  services: LocatorServicesDeps,
  index: DataView,
  savedSearch: SavedSearch
) => {
  const [hideTimeColumn, useFieldsFromSource] = await Promise.all([
    services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING),
    services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE),
  ]);

  // Add/adjust columns from the saved search attributes and UI Settings
  let columns: string[] | undefined;
  let columnsNext: string[] | undefined;
  let timeFieldName: string | undefined;
  // ignore '_source' column: it may be the only column when the user wishes to export all fields
  const columnsTemp = savedSearch.columns?.filter((col) => col !== '_source');

  if (typeof columnsTemp !== 'undefined' && columnsTemp.length > 0 && isStringArray(columnsTemp)) {
    columns = columnsTemp;

    // conditionally add the time field column:
    if (index?.timeFieldName && !hideTimeColumn) {
      timeFieldName = index.timeFieldName;
    }
    if (timeFieldName && !columnsTemp.includes(timeFieldName)) {
      columns = [timeFieldName, ...columns];
    }

    /*
     * For querying performance, the searchSource object must have fields set.
     * Otherwise, the requests will ask for all fields, even if only a few are really needed.
     * Discover does not set fields, since having all fields is needed for the UI.
     */
    if (!useFieldsFromSource && columns.length) {
      columnsNext = columns;
    }
  }

  return {
    timeFieldName,
    columns: columnsNext,
  };
};

/**
 * @internal
 */
export function columnsFromLocatorFactory(services: LocatorServicesDeps) {
  /**
   * Allows consumers to retrieve a set of selected fields from a search in DiscoverAppLocatorParams
   *
   * @public
   */
  const columnsFromLocator = async (
    params: DiscoverAppLocatorParams
  ): Promise<string[] | undefined> => {
    if (!params.savedSearchId) {
      throw new Error(`Saved Search ID is required in DiscoverAppLocatorParams`);
    }

    const savedSearch = await getSavedSearch(params.savedSearchId, services);

    const index = savedSearch.searchSource.getField('index');

    if (!index) {
      throw new Error(`Search Source is missing the "index" field`);
    }

    const { columns } = await getColumns(services, index, savedSearch);

    return columns;
  };
  return columnsFromLocator;
}

export type ColumnsFromLocatorFn = ReturnType<typeof columnsFromLocatorFactory>;
