/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getAllLogsDataViewSpec } from '@kbn/discover-utils/src';
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { getSearchEmbeddableFactory } from './get_search_embeddable_factory';
import { LEGACY_LOG_STREAM_EMBEDDABLE } from './constants';

export const getLegacyLogStreamEmbeddableFactory = (
  ...[{ startServices, discoverServices }]: Parameters<typeof getSearchEmbeddableFactory>
) => {
  const searchEmbeddableFactory = getSearchEmbeddableFactory({ startServices, discoverServices });
  const logStreamEmbeddableFactory: ReturnType<typeof getSearchEmbeddableFactory> = {
    type: LEGACY_LOG_STREAM_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, ...restParams }) => {
      const searchSource = await discoverServices.data.search.searchSource.create();
      let fallbackPattern = 'logs-*-*';
      // Given that the logDataAccess service is an optional dependency with discover, we need to check if it exists
      if (discoverServices.logsDataAccess) {
        fallbackPattern =
          await discoverServices.logsDataAccess.services.logSourcesService.getFlattenedLogSources();
      }

      const spec = getAllLogsDataViewSpec({ allLogsIndexPattern: fallbackPattern });
      const dataView: DataView = await discoverServices.data.dataViews.create(spec);

      // Finally assign the data view to the search source
      searchSource.setField('index', dataView);

      const savedSearch: SavedSearch = {
        title: initialState.rawState.title,
        description: initialState.rawState.description,
        timeRange: initialState.rawState.timeRange,
        sort: initialState.rawState.sort ?? [],
        columns: initialState.rawState.columns ?? [],
        searchSource,
        managed: false,
      };
      const { searchSourceJSON, references } = searchSource.serialize();

      initialState = {
        ...initialState,
        rawState: {
          ...initialState.rawState,
          attributes: {
            ...toSavedSearchAttributes(savedSearch, searchSourceJSON),
            references,
          },
        },
      };

      return searchEmbeddableFactory.buildEmbeddable({ initialState, ...restParams });
    },
  };

  return logStreamEmbeddableFactory;
};
