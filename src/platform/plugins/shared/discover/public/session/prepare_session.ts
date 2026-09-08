/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { stableStringify } from '@kbn/std';
import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { DiscoverSessionClient } from './api_client';
import { fromDiscoverSessionApiResponse } from './state_adapter';

type ApiResponse = Awaited<ReturnType<DiscoverSessionClient['create']>>;
type ApiResolve = Awaited<ReturnType<DiscoverSessionClient['get']>>['resolve'];
type ApiTab = ApiResponse['data']['tabs'][number];

/** Prepares a loaded API session for Discover, assigning inline IDs and normalizing filters. */
export const prepareDiscoverSession = (
  response: ApiResponse,
  resolve?: ApiResolve
): DiscoverSession => {
  const session = fromDiscoverSessionApiResponse(response, resolve);
  // Share IDs for matching inline specs only within this session, not across separate loads.
  const inlineDataViewIds = new Map<string, string>();

  return {
    ...session,
    tabs: session.tabs.map((tab, index) =>
      prepareTab(tab, response.data.tabs[index], inlineDataViewIds)
    ),
  };
};

const prepareTab = (
  tab: DiscoverSessionTab,
  apiTab: ApiTab,
  inlineDataViewIds: Map<string, string>
): DiscoverSessionTab => {
  const searchSource = assignInlineDataViewId(
    apiTab,
    tab.serializedSearchSource,
    inlineDataViewIds
  );

  return {
    ...tab,
    serializedSearchSource: normalizeSearchSourceFilters(searchSource),
  };
};

const assignInlineDataViewId = (
  apiTab: ApiTab,
  searchSource: SerializedSearchSourceFields,
  inlineDataViewIds: Map<string, string>
): SerializedSearchSourceFields => {
  const { index } = searchSource;
  if (
    apiTab.data_source.type !== AS_CODE_DATA_VIEW_SPEC_TYPE ||
    !index ||
    typeof index === 'string'
  ) {
    return searchSource;
  }

  // The API omits inline IDs, so generate a UUID as DataViewsService.createFromSpec already does
  // on main when an ID is missing. This loader also reuses it for matching specs within this load.
  const specKey = stableStringify(apiTab.data_source);
  const dataViewId = inlineDataViewIds.get(specKey) ?? uuidv4();
  inlineDataViewIds.set(specKey, dataViewId);

  return {
    ...searchSource,
    index: {
      ...index,
      id: dataViewId,
    },
    ...(Array.isArray(searchSource.filter) && {
      filter: searchSource.filter.map((filter) => {
        if (filter.meta.index !== undefined) {
          return filter;
        }

        return {
          ...filter,
          meta: { ...filter.meta, index: dataViewId },
        };
      }),
    }),
  };
};

const normalizeSearchSourceFilters = (
  searchSource: SerializedSearchSourceFields
): SerializedSearchSourceFields => {
  const { filter } = searchSource;
  if (!filter) {
    return searchSource;
  }

  // Use the same filter defaults as FilterManager so loading a session does not mark it as changed.
  return {
    ...searchSource,
    filter: mapAndFlattenFilters(cloneDeep(filter)),
  };
};
