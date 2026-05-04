/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import {
  type PresentationContainer,
  apiHasSerializableState,
  apiHasType,
  apiHasUniqueId,
} from '@kbn/presentation-publishing';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { getESQLQueryVariables } from './query_parsing_helpers';

type EsqlControlState = OptionsListESQLControlState & {
  type: typeof ESQL_CONTROL;
};

interface EsqlControlsState {
  [uuid: string]: EsqlControlState;
}

export function getAllEsqlControls(
  presentationContainer: PresentationContainer
): EsqlControlsState {
  const esqlControlsState: EsqlControlsState = {};

  for (const api of Object.values(presentationContainer.children$.getValue())) {
    if (
      !(
        apiHasType(api) &&
        api.type === ESQL_CONTROL &&
        apiHasUniqueId(api) &&
        apiHasSerializableState(api)
      )
    ) {
      continue;
    }

    const controlState = api.serializeState() as OptionsListESQLControlState;
    const variableName = controlState.variable_name;
    if (!variableName) continue;

    esqlControlsState[api.uuid] = {
      ...controlState,
      type: ESQL_CONTROL,
    };
  }

  return esqlControlsState;
}

export function getEsqlControls(
  presentationContainer: PresentationContainer,
  query: AggregateQuery | Query | undefined
) {
  if (!isOfAggregateQueryType(query)) return;

  const usedVariables = getESQLQueryVariables(query.esql);

  return Object.fromEntries(
    Object.entries(getAllEsqlControls(presentationContainer)).filter(([, control]) =>
      usedVariables.includes(control.variable_name)
    )
  );
}
