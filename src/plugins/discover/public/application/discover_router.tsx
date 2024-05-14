/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import React from 'react';
import { History } from 'history';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { ExperimentalFeatures } from '../../common/config';
import { ContextAppRoute } from './context';
import { SingleDocRoute } from './doc';
import { DiscoverMainRoute } from './main';
import { NotFoundRoute } from './not_found';
import { DiscoverServices } from '../build_services';
import { ViewAlertRoute } from './view_alert';
import type { DiscoverCustomizationContext } from '../customizations';

export type DiscoverRouterProps = Omit<DiscoverRoutesProps, 'customizationContext'> & {
  customizationContext$: Observable<DiscoverCustomizationContext>;
};

export const DiscoverRouter = ({
  customizationContext$,
  services,
  history,
  ...routeProps
}: DiscoverRouterProps) => {
  const customizationContext = useObservable(customizationContext$);

  // The Discover state is not reactive, so we must avoid initialization before
  // the first value is emitted
  if (customizationContext == null) {
    return null;
  }

  return (
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <Router history={history} data-test-subj="discover-react-router">
          <DiscoverRoutes
            customizationContext={customizationContext}
            services={services}
            history={history}
            {...routeProps}
          />
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  );
};

export interface DiscoverRoutesProps {
  services: DiscoverServices;
  customizationContext: DiscoverCustomizationContext;
  experimentalFeatures: ExperimentalFeatures;
  history: History;
}

// this exists as a separate component to allow the tests to gather the routes
export const DiscoverRoutes = ({
  customizationContext,
  services,
  history,
  ...routeProps
}: DiscoverRoutesProps) => {
  return (
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
        <DiscoverMainRoute customizationContext={customizationContext} {...routeProps} />
      </Route>
      <Route path="/" exact>
        <DiscoverMainRoute customizationContext={customizationContext} {...routeProps} />
      </Route>
      <NotFoundRoute />
    </Routes>
  );
};
