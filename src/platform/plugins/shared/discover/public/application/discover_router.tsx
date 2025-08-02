/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { ContextAppRoute } from './context';
import { SingleDocRoute } from './doc';
import { NotFoundRoute } from './not_found';
import type { DiscoverServices } from '../build_services';
import { ViewAlertRoute } from './view_alert';
import type { DiscoverCustomizationContext } from '../customizations';
import { DiscoverMainRoute } from './main';

export interface DiscoverRouterProps {
  services: DiscoverServices;
  customizationContext: DiscoverCustomizationContext;
}

export const DiscoverRouter = ({ services, ...routeProps }: DiscoverRouterProps) => {
  return (
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <Router history={services.history} data-test-subj="discover-react-router">
          <DiscoverRoutes {...routeProps} />
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  );
};

// this exists as a separate component to allow the tests to gather the routes
export const DiscoverRoutes = ({
  ...routeProps
}: Pick<DiscoverRouterProps, 'customizationContext'>) => {
  return (
    <PerformanceContextProvider>
      <Routes>
        <Route path="/context/:dataViewId/:id">
          <ContextAppRoute />
        </Route>
        <Route
          path="/doc/:dataView/:index/:type"
          render={(props) => (
            <Redirect to={`/doc/${props.match.params.dataView}/${props.match.params.index}`} />
          )}
        />
        <Route path="/doc/:dataViewId/:index">
          <SingleDocRoute />
        </Route>
        <Route path="/viewAlert/:id">
          <ViewAlertRoute />
        </Route>
        <Route path="/view/:id">
          <DiscoverMainRoute {...routeProps} />
        </Route>
        <Route path="/" exact>
          <DiscoverMainRoute {...routeProps} />
        </Route>
        <NotFoundRoute />
      </Routes>
    </PerformanceContextProvider>
  );
};
