/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import useObservable from 'react-use/lib/useObservable';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { useDashboardApi } from './use_dashboard_api';
import { useDashboardInternalApi } from './use_dashboard_internal_api';

/**
 * Tracks unpublished filters, time slice, and ES|QL variables, and exposes a single action that
 * publishes whichever of them are pending. Shared by every Apply button so they behave identically.
 */
export const useApplyUnpublishedChanges = (): {
  hasUnpublishedChanges: boolean;
  applyUnpublishedChanges: () => void;
} => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const [
    hasUnpublishedFilters,
    publishedTimeslice,
    unpublishedTimeslice,
    publishedEsqlVariables,
    unpublishedEsqlVariables,
  ] = useBatchedPublishingSubjects(
    dashboardApi.hasUnpublishedFilters$,
    dashboardApi.publishedTimeslice$,
    dashboardApi.unpublishedTimeslice$,
    dashboardInternalApi.publishedEsqlVariables$,
    dashboardInternalApi.unpublishedEsqlVariables$
  );

  // Filters are only staged once every child is done loading, while publishing reads the live "awaiting
  // required filters" state. Applying mid-load could pair an older batch of filters with a newer awaiting
  // state and open the grid without the required filter, so nothing can be applied until loading settles.
  const childFiltersLoading = useObservable(dashboardApi.childFiltersLoading$, true);

  const hasUnpublishedTimeslice = useMemo(
    () => !deepEqual(publishedTimeslice, unpublishedTimeslice),
    [publishedTimeslice, unpublishedTimeslice]
  );
  const hasUnpublishedVariables = useMemo(
    () => !deepEqual(publishedEsqlVariables, unpublishedEsqlVariables),
    [publishedEsqlVariables, unpublishedEsqlVariables]
  );

  const applyUnpublishedChanges = useCallback(() => {
    if (hasUnpublishedFilters) dashboardApi.publishFilters();
    if (hasUnpublishedTimeslice) dashboardApi.publishTimeslice();
    if (hasUnpublishedVariables) dashboardInternalApi.publishVariables();
  }, [
    dashboardApi,
    dashboardInternalApi,
    hasUnpublishedFilters,
    hasUnpublishedTimeslice,
    hasUnpublishedVariables,
  ]);

  return {
    hasUnpublishedChanges:
      !childFiltersLoading &&
      (hasUnpublishedFilters || hasUnpublishedTimeslice || hasUnpublishedVariables),
    applyUnpublishedChanges,
  };
};
