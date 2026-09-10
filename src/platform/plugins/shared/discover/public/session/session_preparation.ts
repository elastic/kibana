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
import type { DiscoverSessionApiResponse, DiscoverSessionApiTab } from '../../server';
import type { DiscoverSessionResolve } from './api_client';
import { fromDiscoverSessionApiResponse } from './session_conversions';

// Completes API data when loading a session, not when saving it.
// Matching inline Data Views share a local ID, which is also assigned to filters without one.
// Filter defaults match the UI so opening a session does not show false unsaved changes.

/** Builds Discover state from a loaded API response, adding the local IDs and filter defaults the UI needs. */
export const prepareDiscoverSession = (
  response: DiscoverSessionApiResponse,
  resolve?: DiscoverSessionResolve
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

/** Completes the tab's data view and filter state without changing its other saved settings. */
const prepareTab = (
  tab: DiscoverSessionTab,
  apiTab: DiscoverSessionApiTab,
  inlineDataViewIds: Map<string, string>
) => {
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

/** Gives matching inline Data Views one ID per load and assigns it to filters without a Data View ID. */
const assignInlineDataViewId = (
  apiTab: DiscoverSessionApiTab,
  searchSource: SerializedSearchSourceFields,
  inlineDataViewIds: Map<string, string>
) => {
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

/** Applies FilterManager's defaults to copied filters so opening a session does not look like an edit. */
const normalizeSearchSourceFilters = (searchSource: SerializedSearchSourceFields) => {
  const { filter } = searchSource;
  if (!filter) {
    return searchSource;
  }

  return {
    ...searchSource,
    filter: mapAndFlattenFilters(cloneDeep(filter)),
  };
};
