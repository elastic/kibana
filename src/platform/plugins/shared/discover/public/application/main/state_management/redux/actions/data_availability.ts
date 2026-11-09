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
import { getMemoizedRequest } from '../utils';

const initialESDataAvailabilityRequests = new WeakMap<RuntimeStateManager, Promise<void>>();
const initialDataViewAvailabilityRequests = new WeakMap<RuntimeStateManager, Promise<void>>();

/**
 * Waits until we can decide whether to open. With `needsDataView`, `hasDataView` is final;
 * otherwise a false flag may still mean its check is pending.
 */
export const loadDataAvailabilityOnce: InternalStateThunkActionCreator<
  [options?: { needsDataView?: boolean }],
  Promise<DiscoverInternalState['initializationState']>
> = ({ needsDataView = false } = {}) =>
  async function loadDataAvailabilityOnceThunkFn(dispatch, getState) {
    const esDataRequest = dispatch(loadESDataAvailabilityOnce());
    const dataViewRequest = dispatch(loadDataViewAvailabilityOnce());
    const availabilityRequests = [esDataRequest, dataViewRequest];

    // ES data alone can't decide whether a tab that needs a data view can open.
    const isAvailable = await (needsDataView
      ? dataViewRequest
      : Promise.race(availabilityRequests));

    if (!isAvailable) {
      await Promise.all(availabilityRequests);
    }

    return getState().initializationState;
  };

/**
 * Checks ES indices and ES|QL datasets once per Discover instance. Resolves with the current
 * state, which a data view created after the check may have updated.
 */
export const loadESDataAvailabilityOnce: InternalStateThunkActionCreator<
  [],
  Promise<boolean>
> = () =>
  async function loadESDataAvailabilityOnceThunkFn(
    dispatch,
    getState,
    { services, runtimeStateManager }
  ) {
    await getMemoizedRequest(initialESDataAvailabilityRequests, runtimeStateManager, async () => {
      const hasESData = await fetchESDataAvailability(services);

      dispatch(
        internalStateSlice.actions.setInitializationState({
          ...getState().initializationState,
          hasESData,
        })
      );
    });

    return getState().initializationState.hasESData;
  };

/**
 * Checks for persisted data views once per Discover instance, independently of the data checks.
 * Resolves with the current state, which a data view created after the check may have updated.
 */
export const loadDataViewAvailabilityOnce: InternalStateThunkActionCreator<
  [],
  Promise<boolean>
> = () =>
  async function loadDataViewAvailabilityOnceThunkFn(
    dispatch,
    getState,
    { services, runtimeStateManager }
  ) {
    await getMemoizedRequest(initialDataViewAvailabilityRequests, runtimeStateManager, async () => {
      const hasDataView = await services.dataViews.hasData.hasDataView().catch(() => false);

      dispatch(
        internalStateSlice.actions.setInitializationState({
          ...getState().initializationState,
          hasDataView,
        })
      );
    });

    return getState().initializationState.hasDataView;
  };

const fetchESDataAvailability = async ({ core, dataViews }: DiscoverServices): Promise<boolean> => {
  const [hasESData, hasESQLDatasets] = await Promise.all([
    dataViews.hasData.hasESData().catch(() => false),
    core.http
      .get<EsqlDatasetsResult>(DATASETS_ROUTE)
      .then(({ datasets }) => datasets.length > 0)
      .catch(() => false),
  ]);

  return hasESData || hasESQLDatasets;
};
