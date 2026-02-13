/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Filter } from '@kbn/es-query';
import {
  type HasParentApi,
  type PublishesSavedObjectId,
  type PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { SerializableRecord } from '@kbn/utility-types';
import { getEsqlControls } from '@kbn/esql-utils';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { DiscoverAppLocatorParams } from '../../../common';
import { type PublishesSavedSearch } from '../types';

export const getDiscoverLocatorParams = (
  api: PublishesSavedSearch &
    Partial<PublishesSavedObjectId & PublishesUnifiedSearch & HasParentApi>
) => {
  const savedSearch = api.savedSearch$.getValue();
  const query = savedSearch?.searchSource.getField('query');

  const dataView = savedSearch?.searchSource.getField('index');
  const savedObjectId = api.savedObjectId$?.getValue();
  const presentationContainer = apiIsPresentationContainer(api.parentApi)
    ? api.parentApi
    : undefined;

  const locatorParams: DiscoverAppLocatorParams = savedObjectId
    ? { savedSearchId: savedObjectId }
    : {
        dataViewId: dataView?.id,
        dataViewSpec: dataView?.toMinimalSpec(),
        esqlControls: presentationContainer
          ? (getEsqlControls(
              presentationContainer,
              query
            ) as ControlPanelsState<OptionsListESQLControlState> & SerializableRecord)
          : undefined,
        timeRange: savedSearch?.timeRange,
        refreshInterval: savedSearch?.refreshInterval,
        filters: savedSearch?.searchSource.getField('filter') as Filter[],
        query,
        columns: savedSearch?.columns,
        sort: savedSearch?.sort,
        viewMode: savedSearch?.viewMode,
        hideAggregatedPreview: savedSearch?.hideAggregatedPreview,
      };

  return locatorParams;
};
