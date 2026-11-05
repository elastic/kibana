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
import { ADHOC_DATA_VIEW_RENDER_EVENT } from '../../../constants';
import { useFiltersValidation } from './use_filters_validation';
import { useCurrentDataSource } from '../state_management/redux';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

export const useAdHocDataViews = () => {
  const dataSource = useCurrentDataSource();
  const { filterManager, toastNotifications, trackUiMetric } = useDiscoverServices();

  useEffect(() => {
    // Only count ad hoc data views used in classic mode, since they are user-created
    if (dataSource.kind === 'index-pattern' && !dataSource.isPersisted()) {
      trackUiMetric?.(METRIC_TYPE.COUNT, ADHOC_DATA_VIEW_RENDER_EVENT);
    }
  }, [dataSource, trackUiMetric]);

  /**
   * Takes care of checking data view id references in filters
   */
  useFiltersValidation({ dataSource, filterManager, toastNotifications });
};
