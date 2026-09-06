/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { DATASETS_ROUTE, type EsqlDatasetsResult } from '@kbn/esql-types';
import type { RootProfileState } from '../../../context_awareness';
import { useDefaultAdHocDataViews } from '../../../context_awareness';
import {
  type DiscoverInternalState,
  internalStateActions,
  useInternalStateDispatch,
} from '../state_management/redux';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useAsyncFunction } from '../hooks/use_async_function';

export const useDiscoverStartupGate = ({
  rootProfileState,
  useEsqlTabState,
}: {
  rootProfileState: RootProfileState;
  useEsqlTabState: boolean;
}) => {
  const services = useDiscoverServices();
  const { core, dataViews } = services;
  const dispatch = useInternalStateDispatch();
  const { initializeProfileDataViews } = useDefaultAdHocDataViews();

  // Availability and the Data View catalog keep loading even when ES|QL does not wait for them.
  const [availabilityState, loadAvailability] = useAsyncFunction(async () => {
    const [hasESData, hasUserDataView, defaultDataViewExists, hasESQLDatasets] = await Promise.all([
      dataViews.hasData.hasESData().catch(() => false),
      dataViews.hasData.hasUserDataView().catch(() => false),
      dataViews.defaultDataViewExists().catch(() => false),
      core.http
        .get<EsqlDatasetsResult>(DATASETS_ROUTE)
        .then(({ datasets }) => datasets.length > 0)
        .catch(() => false),
      dispatch(internalStateActions.loadDataViewList()).catch(() => {}),
    ]);
    const availability: DiscoverInternalState['initializationState'] = {
      hasESData: hasESData || hasESQLDatasets,
      hasUserDataView: (hasUserDataView && defaultDataViewExists) || hasESQLDatasets,
    };

    dispatch(internalStateActions.setInitializationState(availability));
    return availability;
  });

  // Root profile setup remains blocking for every Discover entry.
  const [profileState, initializeProfile] = useAsyncFunction(
    async (loadedRootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>) => {
      await initializeProfileDataViews(loadedRootProfileState).catch(() => {});
      dispatch(
        internalStateActions.setDefaultProfileEsqlQuery(
          loadedRootProfileState.getDefaultEsqlQuery()
        )
      );
    }
  );

  useEffect(() => {
    if (!rootProfileState.rootProfileLoading) {
      // Start the background checks and the blocking profile setup together.
      loadAvailability();
      initializeProfile(rootProfileState);
    }
  }, [initializeProfile, loadAvailability, rootProfileState]);

  const availability = availabilityState.value;
  let noDataPageState: typeof availability;
  if (
    !useEsqlTabState &&
    availability &&
    !availability.hasESData &&
    !availability.hasUserDataView
  ) {
    noDataPageState = availability;
  }

  return {
    error: profileState.error ?? (!useEsqlTabState ? availabilityState.error : undefined),
    loading:
      rootProfileState.rootProfileLoading ||
      profileState.loading ||
      (!useEsqlTabState && availabilityState.loading),
    noDataPageState,
  };
};
