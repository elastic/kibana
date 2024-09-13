/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';

import { servicesReady } from '../plugin';
import { DashboardListingProps } from './types';

const ListingTableLoadingIndicator = () => {
  return <EuiEmptyPrompt icon={<EuiLoadingSpinner size="l" />} />;
};

const LazyDashboardListing = React.lazy(() =>
  (async () => {
    const modulePromise = import('./dashboard_listing_table');
    const [module] = await Promise.all([modulePromise, servicesReady]);

    return {
      default: module.DashboardListingTable,
    };
  })().then((module) => module)
);

export const DashboardListingTable = (props: DashboardListingProps) => {
  return (
    <Suspense fallback={<ListingTableLoadingIndicator />}>
      <LazyDashboardListing {...props} />
    </Suspense>
  );
};
