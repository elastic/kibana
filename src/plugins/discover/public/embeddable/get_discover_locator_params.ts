/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';
import { PublishesUnifiedSearch, PublishesSavedObjectId } from '@kbn/presentation-publishing';
import type { DiscoverAppLocatorParams } from '../../common';
import { HasSavedSearch } from './types';

export const getDiscoverLocatorParams = (
  api: HasSavedSearch & Partial<PublishesSavedObjectId & PublishesUnifiedSearch>
) => {
  const savedSearch = api.getSavedSearch();

  const dataView = savedSearch?.searchSource.getField('index');
  const savedObjectId = api.savedObjectId?.getValue();
  const locatorParams: DiscoverAppLocatorParams = savedObjectId
    ? { savedSearchId: savedObjectId }
    : {
        dataViewId: dataView?.id,
        dataViewSpec: dataView?.toMinimalSpec(),
        timeRange: savedSearch?.timeRange,
        refreshInterval: savedSearch?.refreshInterval,
        filters: savedSearch?.searchSource.getField('filter') as Filter[],
        query: savedSearch?.searchSource.getField('query'),
        columns: savedSearch?.columns,
        sort: savedSearch?.sort,
        viewMode: savedSearch?.viewMode,
        hideAggregatedPreview: savedSearch?.hideAggregatedPreview,
        breakdownField: savedSearch?.breakdownField,
      };

  return locatorParams;
};
