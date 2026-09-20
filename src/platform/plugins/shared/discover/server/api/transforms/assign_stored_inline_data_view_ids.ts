/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { isCombinedFilter } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { getDataViewSpecKey, getInlineDataView } from '../../../common/session/inline_data_view';

/** Gives public API writes inline IDs, keeping the previous ID when the same tab's definition is unchanged. */
export const assignStoredInlineDataViewIds = (
  attributes: DiscoverSessionAttributes,
  existingAttributes?: DiscoverSessionAttributes
): DiscoverSessionAttributes => {
  const existingTabs = new Map(existingAttributes?.tabs.map((tab) => [tab.id, tab]));

  return {
    ...attributes,
    tabs: attributes.tabs.map((tab) => {
      const { kibanaSavedObjectMeta } = tab.attributes;
      const searchSource = parseSearchSourceJSON(kibanaSavedObjectMeta.searchSourceJSON);
      const dataView = getInlineDataView(searchSource);
      if (!dataView) {
        return tab;
      }

      const existingTab = existingTabs.get(tab.id);
      const existingDataView = existingTab
        ? getInlineDataView(
            parseSearchSourceJSON(existingTab.attributes.kibanaSavedObjectMeta.searchSourceJSON)
          )
        : undefined;
      const previousId =
        existingDataView?.id !== undefined &&
        getDataViewSpecKey(existingDataView) === getDataViewSpecKey(dataView)
          ? existingDataView.id
          : undefined;
      // Keep an already assigned ID so calling this helper again does not change it.
      const id = dataView.id ?? previousId ?? uuidv4();

      // References have already been extracted. Keep the inline ID in the JSON, so it
      // does not become a reference to a saved Data View that doesn't exist.
      const storedSearchSource: SerializedSearchSourceFields = {
        ...searchSource,
        index: { ...dataView, id },
        ...(searchSource.filter && {
          filter: searchSource.filter.map((filter) => bindImplicitFilter(filter, id)),
        }),
      };

      return {
        ...tab,
        attributes: {
          ...tab.attributes,
          kibanaSavedObjectMeta: {
            ...kibanaSavedObjectMeta,
            searchSourceJSON: JSON.stringify(storedSearchSource),
          },
        },
      };
    }),
  };
};

const bindImplicitFilter = (filter: Filter, dataViewId: string): Filter => {
  const { meta } = filter;
  return {
    ...filter,
    meta: {
      ...meta,
      ...(meta.index === undefined && !('indexRefName' in meta) && { index: dataViewId }),
      // Nested filters live in the AND/OR group's params. Bind their implicit references too.
      ...(isCombinedFilter(filter) && {
        params: filter.meta.params.map((child) => bindImplicitFilter(child, dataViewId)),
      }),
    },
  };
};
