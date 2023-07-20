/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, useMemo } from 'react';
import type { DiscoverTopNavProps } from '../application/main/components/top_nav/discover_topnav';
import { ServicesContextProvider } from '../application/services_provider';
import { DiscoverServices } from '../build_services';

export type ExportedDiscoverTopNav = Omit<DiscoverTopNavProps, 'services'>;

const DiscoverTopNav = React.lazy(
  () => import('../application/main/components/top_nav/discover_topnav')
);
export const useDiscoverTopNav = (services: DiscoverServices) => {
  return useMemo(
    () => (props: ExportedDiscoverTopNav) =>
      (
        <ServicesContextProvider services={services}>
          <Suspense fallback={null}>
            <DiscoverTopNav {...props} />
          </Suspense>
        </ServicesContextProvider>
      ),
    [services]
  );
};
