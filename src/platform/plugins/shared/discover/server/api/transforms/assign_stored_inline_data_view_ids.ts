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

/** Keeps IDs for unchanged views, gives edits new IDs, and shares matching views without stored IDs. */
export const assignStoredInlineDataViewIds = (
  attributes: DiscoverSessionAttributes,
  existingAttributes?: DiscoverSessionAttributes
): DiscoverSessionAttributes => {
  const existingTabs = new Map(existingAttributes?.tabs.map((tab) => [tab.id, tab]));
  const idsBySpec = new Map<string, string>();

  // Prepare existing identities before new tabs, even when a copy comes before its original.
  const preparedTabs = attributes.tabs.map((tab) => {
    const searchSource = parseSearchSourceJSON(
      tab.attributes.kibanaSavedObjectMeta.searchSourceJSON
    );
    const dataView = getInlineDataView(searchSource);
    if (!dataView) {
      return { tab, inlineView: undefined };
    }

    const existingTab = existingTabs.get(tab.id);
    const specKey = getDataViewSpecKey(dataView);
    const existingDataView = existingTab
      ? getInlineDataView(
          parseSearchSourceJSON(existingTab.attributes.kibanaSavedObjectMeta.searchSourceJSON)
        )
      : undefined;
    const previousId =
      existingDataView?.id !== undefined && getDataViewSpecKey(existingDataView) === specKey
        ? existingDataView.id
        : undefined;
    const id =
      dataView.id ?? previousId ?? (existingDataView?.id !== undefined ? uuidv4() : undefined);

    // Existing IDs stay separate; views without one reuse the first match in request order.
    if (id !== undefined && !idsBySpec.has(specKey)) {
      idsBySpec.set(specKey, id);
    }

    return { tab, inlineView: { searchSource, dataView, specKey, id } };
  });

  return {
    ...attributes,
    tabs: preparedTabs.map(({ tab, inlineView }) => {
      if (!inlineView) {
        return tab;
      }

      const { searchSource, dataView, specKey, id: preparedId } = inlineView;
      const id = preparedId ?? idsBySpec.get(specKey) ?? uuidv4();
      if (!idsBySpec.has(specKey)) {
        idsBySpec.set(specKey, id);
      }

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
            ...tab.attributes.kibanaSavedObjectMeta,
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
