/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { DiscoverServices } from '../../../build_services';
import { useSavedSearch } from '../services/discover_state_provider';
import { isTextBasedQuery } from '../utils/is_text_based_query';
import { useAppStateSelector } from '../services/discover_app_state_container';
import { useInternalStateSelector } from '../services/discover_internal_state_container';
import { ADHOC_DATA_VIEW_RENDER_EVENT } from '../../../constants';
import { DiscoverStateContainer } from '../services/discover_state';
import { useFiltersValidation } from './use_filters_validation';

export const useAdHocDataViews = ({
  services,
}: {
  stateContainer: DiscoverStateContainer;
  services: DiscoverServices;
}) => {
  const query = useAppStateSelector((state) => state.query);
  const dataView = useInternalStateSelector((state) => state.dataView);
  const savedSearch = useSavedSearch();
  const isTextBasedMode = isTextBasedQuery(query);
  const { filterManager, toastNotifications } = services;

  useEffect(() => {
    if (dataView && !dataView.isPersisted()) {
      services.trackUiMetric?.(METRIC_TYPE.COUNT, ADHOC_DATA_VIEW_RENDER_EVENT);
    }
  }, [dataView, isTextBasedMode, services]);

  /**
   * Takes care of checking data view id references in filters
   */
  useFiltersValidation({ savedSearch, filterManager, toastNotifications });
};
