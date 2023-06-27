/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, useCallback } from 'react';
import type { MainRouteProps as DiscoverMainRouteProps } from '../application/main/discover_main_route';
import { setHeaderActionMenuMounter, setScopedHistory } from '../kibana_services';
import { ServicesContextProvider } from '../application/services_provider';
import { DiscoverServices } from '../build_services';

export type ExportedDiscoverMainRoute = DiscoverMainRouteProps;

const DiscoverMainRoute = React.lazy(() => import('../application/main/discover_main_route'));

export interface UseDiscoverMainRouteInternalProps {
  services: DiscoverServices;
}

export const useDiscoverMainRouteInternal = ({ services }: UseDiscoverMainRouteInternalProps) => {
  return useCallback(
    (history) => (props: ExportedDiscoverMainRoute) => {
      setScopedHistory(history);
      setHeaderActionMenuMounter(() => {});
      return (
        <ServicesContextProvider services={services}>
          <Suspense fallback={null}>
            <DiscoverMainRoute
              isDev={props.isDev}
              customizationCallbacks={props.customizationCallbacks}
              mode="embedded"
            />
          </Suspense>
        </ServicesContextProvider>
      );
    },
    [services]
  );
};
