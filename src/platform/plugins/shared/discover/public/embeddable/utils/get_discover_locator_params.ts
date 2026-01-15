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
  type HasParentApi,
  type PublishesSavedObjectId,
  type PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { isApiESQLVariablesCompatible } from '@kbn/lens-plugin/public/react_embeddable/type_guards';
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

  const locatorParams: DiscoverAppLocatorParams = savedObjectId
    ? { savedSearchId: savedObjectId }
    : {
        dataViewId: dataView?.id,
        dataViewSpec: dataView?.toMinimalSpec(),
        esqlControls: getEsqlControls(api.parentApi, query),
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

function getEsqlControls(embeddableParentApi: unknown, query: AggregateQuery | Query | undefined) {
  if (!isOfAggregateQueryType(query)) return;
  if (!isApiESQLVariablesCompatible(embeddableParentApi)) return undefined;

  const controlGroupApi = embeddableParentApi.controlGroupApi$.getValue();
  if (!controlGroupApi) return undefined;

  const serializedState = controlGroupApi.serializeState?.();
  if (!serializedState) return undefined;

  const usedVariables = getESQLQueryVariables(query.esql);

  return serializedState.rawState.controls.reduce((acc, control) => {
    if (!control.id) return acc;
    if (control.type !== ESQL_CONTROL) return acc; // only include ESQL controls
    if (!control.controlConfig) return acc;

    const variableName =
      'variableName' in control.controlConfig && (control.controlConfig.variableName as string);
    if (!variableName) return acc;

    const isUsed = usedVariables.includes(variableName);
    if (!isUsed) return acc;

    return {
      ...acc,
      [control.id]: {
        ...control.controlConfig,
        type: control.type,
        order: control.order,
      },
    };
  }, {});
}
