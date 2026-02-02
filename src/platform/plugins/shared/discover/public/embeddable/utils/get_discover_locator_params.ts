/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType, type Filter } from '@kbn/es-query';
import {
  apiHasSerializableState,
  apiHasType,
  apiHasUniqueId,
  type HasParentApi,
  type PublishesSavedObjectId,
  type PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { ESQLControlState } from '@kbn/esql-types';
import type { Serializable, SerializableRecord } from '@kbn/utility-types';
import { isControlGroupRendererApi, type ControlPanelsState } from '@kbn/control-group-renderer';
import type { PresentationContainer } from '@kbn/presentation-containers';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import { type PublishesSavedSearch } from '../types';
import type { DiscoverAppLocatorParams } from '../../../common';

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
          ? getEsqlControls(presentationContainer, query)
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

function getEsqlControls(
  presentationContainer: PresentationContainer,
  query: AggregateQuery | Query | undefined
) {
  if (!isOfAggregateQueryType(query)) return;

  const usedVariables = getESQLQueryVariables(query.esql);
  const controlsLayout = isControlGroupRendererApi(presentationContainer)
    ? presentationContainer.getControls()
    : {};

  const esqlControlState = Object.values(presentationContainer.children$.getValue()).reduce(
    (acc: { [uuid: string]: Serializable }, api, index) => {
      if (
        !(
          apiHasType(api) &&
          api.type === ESQL_CONTROL &&
          apiHasUniqueId(api) &&
          apiHasSerializableState(api)
        )
      ) {
        return acc;
      }

      const controlState = api.serializeState() as ESQLControlState;
      const variableName = 'variableName' in controlState && (controlState.variableName as string);
      if (!variableName) return acc;
      const isUsed = usedVariables.includes(variableName);
      if (!isUsed) return acc;

      return {
        ...acc,
        [api.uuid]: {
          type: api.type,
          ...controlState,
          ...(controlsLayout[api.uuid]
            ? {
                ...omit(controlsLayout[api.uuid], 'type'),
              }
            : { order: index }),
        },
      };
    },
    {}
  );

  return esqlControlState as ControlPanelsState<ESQLControlState> & SerializableRecord;
}
