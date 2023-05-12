/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, useMemo } from 'react';
import { ServicesContextProvider } from '../application/services_provider';
import { DiscoverServices } from '../build_services';
import type { DiscoverGridProps } from '../components/discover_grid/discover_grid';

export type ExportedDiscoverGrid = Omit<DiscoverGridProps, 'services'>;

const DiscoverGrid = React.lazy(() => import('../components/discover_grid/discover_grid'));
export const useDiscoverGrid = (services: DiscoverServices) => {
  return useMemo(
    () => (props: ExportedDiscoverGrid) =>
      (
        <ServicesContextProvider services={services}>
          <Suspense fallback={null}>
            <DiscoverGrid {...{ ...props, services }} />
          </Suspense>
        </ServicesContextProvider>
      ),
    [services]
  );
};
