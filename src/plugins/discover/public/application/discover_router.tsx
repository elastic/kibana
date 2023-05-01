/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Redirect, Router, Switch, useParams } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import React, { useCallback, useMemo } from 'react';
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

interface DiscoverRoutesProps {
  prefix?: string;
  registerExtensions: RegisterExtensions[];
  isDev: boolean;
}

const DiscoverRoutes = ({ prefix, ...mainRouteProps }: DiscoverRoutesProps) => {
  const prefixPath = useCallback(
    (path: string) => (prefix ? `${prefix}/${path}` : `/${path}`),
    [prefix]
  );

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

interface CustomDiscoverRoutesProps {
  registerExtensionsMap: Map<string, RegisterExtensions[]>;
  isDev: boolean;
}

const CustomDiscoverRoutes = ({ registerExtensionsMap, ...props }: CustomDiscoverRoutesProps) => {
  const { profile } = useParams<{ profile: string }>();
  const registerExtensions = useMemo(
    () => registerExtensionsMap.get(profile),
    [profile, registerExtensionsMap]
  );

  if (registerExtensions) {
    return (
      <DiscoverRoutes prefix={`/p/${profile}`} registerExtensions={registerExtensions} {...props} />
    );
  }

  return <NotFoundRoute />;
};

export interface DiscoverRouterProps {
  services: DiscoverServices;
  registerExtensionsMap: Map<string, RegisterExtensions[]>;
  history: History;
  isDev: boolean;
}

export const DiscoverRouter = ({
  services,
  history,
  registerExtensionsMap,
  ...routeProps
}: DiscoverRouterProps) => {
  const registerDefaultExtensions = useMemo(
    () => registerExtensionsMap.get('default') ?? [],
    [registerExtensionsMap]
  );

  return (
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <Router history={history} data-test-subj="discover-react-router">
          <Switch>
            <Route path="/p/:profile">
              <CustomDiscoverRoutes registerExtensionsMap={registerExtensionsMap} {...routeProps} />
            </Route>
            <Route path="/">
              <DiscoverRoutes registerExtensions={registerDefaultExtensions} {...routeProps} />
            </Route>
          </Switch>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  );
};
