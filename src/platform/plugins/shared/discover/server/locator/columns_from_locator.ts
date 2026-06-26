/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { getSavedSearch } from '@kbn/saved-search-plugin/server';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

/**
 * Determines if a time field should be included based on data view and UI settings
 * @internal
 */
export const shouldIncludeTimeField = async (
  services: LocatorServicesDeps,
  dataView: DataView
): Promise<string | undefined> => {
  const hideTimeColumn = await services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING);
  return dataView?.timeFieldName && !hideTimeColumn ? dataView.timeFieldName : undefined;
};

/**
 * Processes saved search columns and adds time field if needed
 * @internal
 */
export const processSavedSearchColumns = async (
  services: LocatorServicesDeps,
  dataView: DataView,
  savedSearch: { columns?: string[] }
): Promise<string[]> => {
  const timeFieldName = await shouldIncludeTimeField(services, dataView);

  // ignore '_source' column: it may be the only column when the user wishes to export all fields
  const columnsTemp = savedSearch.columns?.filter((col) => col !== '_source');

  if (typeof columnsTemp !== 'undefined' && columnsTemp.length > 0 && isStringArray(columnsTemp)) {
    let columns = columnsTemp;

    // Add time field if it exists and is not already in the columns
    if (timeFieldName && !columnsTemp.includes(timeFieldName)) {
      columns = [timeFieldName, ...columns];
    }

    /*
     * For querying performance, the searchSource object must have fields set.
     * Otherwise, the requests will ask for all fields, even if only a few are really needed.
     * Discover does not set fields, since having all fields is needed for the UI.
     */
    return columns;
  }

  return [];
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
  const columnsFromLocator: ColumnsFromLocatorFn = async (
    params: DiscoverAppLocatorParams
  ): Promise<string[] | undefined> => {
    let dataView: DataView | undefined;
    let savedSearch: SavedSearch | undefined;

    if (params.savedSearchId) {
      // get data view from saved search
      savedSearch = await getSavedSearch(params.savedSearchId, services);
      dataView = savedSearch.searchSource.getField('index');
    } else if (params.dataViewId) {
      // get data view by id
      dataView = await services.dataViewsService.get(params.dataViewId);
    }

    if (!dataView) {
      throw new Error(`Can not determine data view from DiscoverAppLocatorParams!`);
    }

    // If columns are specified in params, they take precedence over saved search columns
    if (params.columns && params.columns.length > 0) {
      let resultColumns = [...params.columns];

      // Get time field directly from data view (no need to process saved search)
      const timeFieldName = await shouldIncludeTimeField(services, dataView);

      // Prepend time field if it exists and is not already in the columns
      if (timeFieldName && !resultColumns.includes(timeFieldName)) {
        resultColumns = [timeFieldName, ...resultColumns];
      }

      return resultColumns;
    }

    // Fallback: locator params don't specify columns, so we use the saved search columns
    const columns = await processSavedSearchColumns(services, dataView, savedSearch ?? {});

    // if columns is empty, return undefined to allow default behavior in Discover
    return columns.length > 0 ? columns : undefined;
  };

  const columnsFromEsqlLocator: ColumnsFromLocatorFn = async (
    params: DiscoverAppLocatorParams
  ): Promise<string[] | undefined> => {
    return params.columns;
  };

  return { columnsFromLocator, columnsFromEsqlLocator };
}

export type ColumnsFromLocatorFn = (
  params: DiscoverAppLocatorParams
) => Promise<string[] | undefined>;
