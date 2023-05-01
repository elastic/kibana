/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Redirect, Router, Switch, useParams } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import React from 'react';
import { History } from 'history';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ContextAppRoute } from './context';
import { SingleDocRoute } from './doc';
import { DiscoverMainRoute } from './main';
import { NotFoundRoute } from './not_found';
import { DiscoverServices } from '../build_services';
import { ViewAlertRoute } from './view_alert';
import type { RegisterExtensions } from '../plugin';

export interface DiscoverRouterProps {
  services: DiscoverServices;
  registerExtensions: RegisterExtensions[];
  history: History;
  isDev: boolean;
}

type DiscoverRoutesProps = Pick<DiscoverRouterProps, 'registerExtensions' | 'isDev'> & {
  prefix?: string;
};

const DiscoverRoutes = ({ prefix, ...mainRouteProps }: DiscoverRoutesProps) => {
  const prefixPath = (path: string) => (prefix ? `/${prefix}/${path}` : `/${path}`);

  return (
    <Switch>
      <Route path={prefixPath('context/:dataViewId/:id')}>
        <ContextAppRoute />
      </Route>
      <Route
        path={prefixPath('doc/:dataView/:index/:type')}
        render={(props) => (
          <Redirect
            to={prefixPath(`doc/${props.match.params.dataView}/${props.match.params.index}`)}
          />
        )}
      />
      <Route path={prefixPath('doc/:dataViewId/:index')}>
        <SingleDocRoute />
      </Route>
      <Route path={prefixPath('viewAlert/:id')}>
        <ViewAlertRoute />
      </Route>
      <Route path={prefixPath('view/:id')}>
        <DiscoverMainRoute {...mainRouteProps} />
      </Route>
      <Route path={prefixPath('')} exact>
        <DiscoverMainRoute {...mainRouteProps} />
      </Route>
      <NotFoundRoute />
    </Switch>
  );
};

const CustomDiscoverRoutes = (props: DiscoverRoutesProps) => {
  const { profile } = useParams<{ profile: string }>();

  if (profile === 'test') {
    return <DiscoverRoutes prefix={profile} {...props} />;
  }

  return <NotFoundRoute />;
};

export const DiscoverRouter = ({ services, history, ...routeProps }: DiscoverRouterProps) => (
  <KibanaContextProvider services={services}>
    <EuiErrorBoundary>
      <Router history={history} data-test-subj="discover-react-router">
        <Switch>
          <Route path="/:profile">
            <CustomDiscoverRoutes {...routeProps} />
          </Route>
          <Route path="/">
            <DiscoverRoutes {...routeProps} />
          </Route>
        </Switch>
      </Router>
    </EuiErrorBoundary>
  </KibanaContextProvider>
);
