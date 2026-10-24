/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATASETS_ROUTE, type EsqlDatasetsResult } from '@kbn/esql-types';
import type { DiscoverServices } from '../../../../../build_services';
import { internalStateSlice, type InternalStateThunkActionCreator } from '../internal_state';
import type { RuntimeStateManager } from '../runtime_state';
import type { DiscoverInternalState } from '../types';

type DataAvailability = DiscoverInternalState['initializationState'];

const initialDataAvailabilityRequests = new WeakMap<
  RuntimeStateManager,
  Promise<DataAvailability>
>();

/** Loads data availability once per Discover instance and shares the result with its tabs. */
export const loadDataAvailabilityOnce: InternalStateThunkActionCreator<
  [],
  Promise<DataAvailability>
> = () =>
  function loadDataAvailabilityOnceThunkFn(dispatch, _, { services, runtimeStateManager }) {
    let request = initialDataAvailabilityRequests.get(runtimeStateManager);

    if (!request) {
      request = fetchDataAvailability(services).then((dataAvailability) => {
        dispatch(internalStateSlice.actions.setInitializationState(dataAvailability));
        return dataAvailability;
      });
      initialDataAvailabilityRequests.set(runtimeStateManager, request);
    }

    return request;
  };

const fetchDataAvailability = async ({
  core,
  dataViews,
}: DiscoverServices): Promise<DataAvailability> => {
  const esDataRequest = dataViews.hasData.hasESData().catch(() => false);
  const esqlDatasetsRequest = core.http
    .get<EsqlDatasetsResult>(DATASETS_ROUTE)
    .then(({ datasets }) => datasets.length > 0)
    .catch(() => false);
  const hasDataView = await dataViews.hasData.hasDataView().catch(() => false);

  if (hasDataView) {
    // With a data view, the welcome page and the tab's data view prompt don't read hasESData.
    return { hasESData: true, hasDataView };
  }

  const [hasESData, hasESQLDatasets] = await Promise.all([esDataRequest, esqlDatasetsRequest]);

  return { hasESData: hasESData || hasESQLDatasets, hasDataView };
};
