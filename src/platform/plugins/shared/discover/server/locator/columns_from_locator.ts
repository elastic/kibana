/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import { resolveLocatorSearch } from './resolve_locator_search';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

/**
 * @internal
 */
export const getColumns = async (
  services: LocatorServicesDeps,
  index: DataView,
  savedSearch: { columns?: string[] }
) => {
  const hideTimeColumn = await services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING);

  // The time field of the data view is needed to apply the time range, independent of
  // whether the time column is shown or any columns are selected.
  const timeFieldName = index?.timeFieldName;

  // Add/adjust columns from the saved search attributes and UI Settings
  let columnsNext: string[] | undefined;
  // ignore '_source' column: it may be the only column when the user wishes to export all fields
  const columnsTemp = savedSearch.columns?.filter((col) => col !== '_source');

  if (typeof columnsTemp !== 'undefined' && columnsTemp.length > 0 && isStringArray(columnsTemp)) {
    let columns = columnsTemp;

    // conditionally add the time field column:
    if (timeFieldName && !hideTimeColumn && !columnsTemp.includes(timeFieldName)) {
      columns = [timeFieldName, ...columns];
    }

    /*
     * For querying performance, the searchSource object must have fields set.
     * Otherwise, the requests will ask for all fields, even if only a few are really needed.
     * Discover does not set fields, since having all fields is needed for the UI.
     */
    if (columns.length) {
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
    const { savedSearch, dataView } = await resolveLocatorSearch(services, params);

    // columns in the locator params (current state) take precedence over the saved search
    const columnsSource = params.columns?.length ? params.columns : savedSearch?.columns;
    const { columns } = await getColumns(services, dataView, { columns: columnsSource });

    return columns;
  };
  return columnsFromLocator;
}

export type ColumnsFromLocatorFn = ReturnType<typeof columnsFromLocatorFactory>;
