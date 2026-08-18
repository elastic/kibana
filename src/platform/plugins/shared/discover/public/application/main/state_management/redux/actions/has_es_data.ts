/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATASETS_ROUTE, type EsqlDatasetsResult } from '@kbn/esql-types';
import { internalStateSlice, type InternalStateThunkActionCreator } from '../internal_state';

/**
 * Checks whether the cluster contains any data, which is only relevant to explain why
 * Discover has nothing to show. Once data was found the result is kept, so the check
 * doesn't cause requests anymore. Mirrors the calculation Discover previously ran on
 * every load of the main route.
 */
export const checkHasESData: InternalStateThunkActionCreator<[], Promise<boolean>> = () =>
  async function checkHasESDataThunkFn(dispatch, getState, { services }) {
    if (getState().hasESData) {
      return true;
    }

    const [hasESData, hasESQLDatasets] = await Promise.all([
      services.dataViews.hasData.hasESData().catch(() => false),
      (async () => {
        try {
          const { datasets } = await services.core.http.get<EsqlDatasetsResult>(DATASETS_ROUTE);
          return datasets.length > 0;
        } catch {
          return false;
        }
      })(),
    ]);
    const nextHasESData = hasESData || hasESQLDatasets;

    dispatch(internalStateSlice.actions.setHasESData(nextHasESData));

    return nextHasESData;
  };
