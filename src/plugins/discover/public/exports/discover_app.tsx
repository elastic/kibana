/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, useCallback } from 'react';
import { ServicesContextProvider } from '../application/services_provider';
import { DiscoverServices } from '../build_services';
import type { Props as DiscoverMainRouteProps } from '../application/main/discover_main_route';
import {
  setHeaderActionMenuMounter,
  setScopedHistory,
  syncHistoryLocations,
} from '../kibana_services';

export type ExportedDiscoverMainRoute = Omit<DiscoverMainRouteProps, 'services'>;

const DiscoverMainRoute = React.lazy(() => import('../application/main/discover_main_route'));
export const useDiscoverMainRoute = (services: DiscoverServices) => {
  return useCallback(
    (history) => (props: ExportedDiscoverMainRoute) => {
      setScopedHistory(history);
      setHeaderActionMenuMounter(() => {});
      syncHistoryLocations();
      return (
        <ServicesContextProvider services={services}>
          <Suspense fallback={null}>
            <DiscoverMainRoute {...{ ...props, services }} />
          </Suspense>
        </ServicesContextProvider>
      );
    },
    [services]
  );
};
