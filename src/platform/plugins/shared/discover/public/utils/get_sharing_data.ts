/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type {
  DataPublicPluginStart,
  ISearchSource,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import {
  getSortForSearchSource,
  isNestedFieldParent,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { DiscoverAppState } from '../application/main/state_management/redux';
import { isEqualFilters } from '../application/main/state_management/utils/state_comparators';
import { showTimeFieldColumn } from './show_time_field_column';

/**
 * Preparing data to share the current state as link or CSV/Report
 */
export async function getSharingData(
  currentSearchSource: ISearchSource,
  state: DiscoverAppState,
  services: { uiSettings: IUiSettingsClient; data: DataPublicPluginStart }
) {
  const { uiSettings, data } = services;
  const searchSource = currentSearchSource.createCopy();
  const index = searchSource.getField('index')!;

  searchSource.setField(
    'sort',
    getSortForSearchSource({
      sort: state.sort as SortOrder[],
      dataView: index,
      defaultSortDir: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    })
  );

  searchSource.removeField('highlight');
  searchSource.removeField('highlightAll');
  searchSource.removeField('aggs');
  searchSource.removeField('size');

  const query = state.query ?? currentSearchSource.getField('query');

  // in ES|QL mode this `columns` array will be used only to generate CSV for Dashboard panels (CSV v2)
  // in Classic mode this `columns` array will be used to generate CSV for both Discover page and Dashboard panels (CSV v1)
  const columns = getColumnsWithTimeField({
    columns: state.columns || [],
    timeFieldName: index?.timeFieldName,
    uiSettings,
    query,
  });

  const absoluteTimeFilter = data.query.timefilter.timefilter.createFilter(index);
  const relativeTimeFilter = data.query.timefilter.timefilter.createRelativeFilter(index);
  return {
    getSearchSource: ({
      addGlobalTimeFilter,
      absoluteTime,
    }: {
      addGlobalTimeFilter?: boolean;
      absoluteTime?: boolean;
    }): SerializedSearchSourceFields => {
      let existingFilter = searchSource.getField('filter') as Filter[] | Filter | undefined;
      const searchSourceUpdated = searchSource.createCopy();
      searchSourceUpdated.removeField('filter');

      const timeFilter = absoluteTime ? absoluteTimeFilter : relativeTimeFilter;
      if (addGlobalTimeFilter && timeFilter) {
        // remove timeFilter from existing filter
        if (Array.isArray(existingFilter)) {
          existingFilter = existingFilter.filter(
            (current) => !isEqualFilters(current, absoluteTimeFilter)
          );
        } else if (isEqualFilters(existingFilter, absoluteTimeFilter)) {
          existingFilter = undefined;
        }

        if (existingFilter) {
          existingFilter = Array.isArray(existingFilter)
            ? [timeFilter, ...existingFilter]
            : ([timeFilter, existingFilter] as Filter[]);
        } else {
          existingFilter = timeFilter;
        }
      }

      if (existingFilter) {
        searchSourceUpdated.setField('filter', existingFilter);
      }

      /*
       * For downstream querying performance, the searchSource object must have fields set.
       * Otherwise, the requests will ask for all fields, even if only a few are really needed.
       * Discover does not set fields, since having all fields is needed for the UI.
       */
      searchSourceUpdated.removeField('fieldsFromSource');
      const fields = columns.length
        ? columns.map((column) => {
            let field = column;

            // If this column is a nested field, add a wildcard to the field name in order to fetch
            // all leaf fields for the report, since the fields API doesn't support nested field roots
            if (isNestedFieldParent(column, index)) {
              field = `${column}.*`;
            }

            return { field, include_unmapped: true };
          })
        : [{ field: '*', include_unmapped: true }];
      searchSourceUpdated.setField('fields', fields);

      return searchSourceUpdated.getSerializedFields(true);
    },
    columns,
  };
}

export function getColumnsWithTimeField({
  columns,
  timeFieldName,
  uiSettings,
  query,
}: {
  columns: string[];
  timeFieldName: string | undefined;
  uiSettings: IUiSettingsClient;
  query?: AggregateQuery | Query;
}): string[] {
  if (
    timeFieldName &&
    columns.length > 0 &&
    !columns.includes(timeFieldName) &&
    showTimeFieldColumn({ uiSettings, query })
  ) {
    return [timeFieldName, ...columns];
  }
  return columns;
}

export interface DiscoverCapabilities {
  createShortUrl?: boolean;
  save?: boolean;
  show?: boolean;
  storeSearchSession?: boolean;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.discover_v2) return false;

  const discover = anonymousUserCapabilities.discover_v2 as unknown as DiscoverCapabilities;

  return !!discover.show;
};
