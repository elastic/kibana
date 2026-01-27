/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';

import { untilPluginStartServicesReady } from '../services/kibana_services';
import type { DashboardListingProps } from './types';

const ListingTableLoadingIndicator = () => {
  return <EuiEmptyPrompt icon={<EuiLoadingSpinner size="l" />} />;
};

const LazyDashboardListing = React.lazy(async () => {
  const [{ DashboardListingTable }] = await Promise.all([
    import('../dashboard_renderer/dashboard_module'),
    untilPluginStartServicesReady(),
  ]);
  return { default: DashboardListingTable };
});

/**
 * A lazy-loaded component that renders the dashboard listing table.
 * This component displays a list of available dashboards with search and filter capabilities.
 *
 * @param props - The {@link DashboardListingProps} for configuring the listing table.
 * @returns A React element containing the dashboard listing table.
 */
export const DashboardListingTable = (props: DashboardListingProps) => {
  return (
    <Suspense fallback={<ListingTableLoadingIndicator />}>
      <LazyDashboardListing {...props} />
    </Suspense>
  );
};
