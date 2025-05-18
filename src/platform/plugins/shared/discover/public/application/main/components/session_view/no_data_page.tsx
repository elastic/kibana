/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withSuspense } from '@kbn/shared-ux-utility';
import React, { lazy, useMemo } from 'react';
import type {
  AnalyticsNoDataPageKibanaDependencies,
  AnalyticsNoDataPageProps,
} from '@kbn/shared-ux-page-analytics-no-data-types';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverInternalState } from '../../state_management/redux';

const importNoData = () => import('@kbn/shared-ux-page-analytics-no-data');
const AnalyticsNoDataPageKibanaProvider = withSuspense(
  lazy(async () => ({ default: (await importNoData()).AnalyticsNoDataPageKibanaProvider }))
);
const AnalyticsNoDataPage = withSuspense(
  lazy(async () => ({ default: (await importNoData()).AnalyticsNoDataPage }))
);

export const NoDataPage = ({
  hasESData,
  hasUserDataView,
  onDataViewCreated,
  onESQLNavigationComplete,
}: DiscoverInternalState['initializationState'] & AnalyticsNoDataPageProps) => {
  const services = useDiscoverServices();
  const noDataDependencies = useMemo<AnalyticsNoDataPageKibanaDependencies>(
    () => ({
      ...services,
      coreStart: services.core,
      dataViews: {
        ...services.dataViews,
        hasData: {
          ...services.dataViews.hasData,
          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(hasESData),
          hasUserDataView: () => Promise.resolve(hasUserDataView),
        },
      },
    }),
    [hasESData, hasUserDataView, services]
  );

  return (
    <AnalyticsNoDataPageKibanaProvider {...noDataDependencies}>
      <AnalyticsNoDataPage
        onDataViewCreated={onDataViewCreated}
        onESQLNavigationComplete={onESQLNavigationComplete}
      />
    </AnalyticsNoDataPageKibanaProvider>
  );
};
