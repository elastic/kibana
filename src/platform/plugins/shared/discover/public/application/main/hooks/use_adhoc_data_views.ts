/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { DiscoverServices } from '../../../build_services';
import { useSavedSearch } from '../state_management/discover_state_provider';
import { useInternalStateSelector } from '../state_management/discover_internal_state_container';
import { ADHOC_DATA_VIEW_RENDER_EVENT } from '../../../constants';
import { DiscoverStateContainer } from '../state_management/discover_state';
import { useFiltersValidation } from './use_filters_validation';
import { useIsEsqlMode } from './use_is_esql_mode';

export const useAdHocDataViews = ({
  services,
}: {
  stateContainer: DiscoverStateContainer;
  services: DiscoverServices;
}) => {
  const dataView = useInternalStateSelector((state) => state.dataView);
  const savedSearch = useSavedSearch();
  const isEsqlMode = useIsEsqlMode();
  const { filterManager, toastNotifications } = services;

  useEffect(() => {
    if (dataView && !dataView.isPersisted()) {
      services.trackUiMetric?.(METRIC_TYPE.COUNT, ADHOC_DATA_VIEW_RENDER_EVENT);
    }
  }, [dataView, isEsqlMode, services]);

  /**
   * Takes care of checking data view id references in filters
   */
  useFiltersValidation({ savedSearch, filterManager, toastNotifications });
};
