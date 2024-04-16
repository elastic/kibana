/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Redirect, useParams } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import React, { useCallback, useMemo } from 'react';
import { History } from 'history';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ExperimentalFeatures } from '../../common/config';
import { ContextAppRoute } from './context';
import { SingleDocRoute } from './doc';
import { DiscoverMainRoute } from './main';
import { NotFoundRoute } from './not_found';
import { DiscoverServices } from '../build_services';
import { ViewAlertRoute } from './view_alert';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../customizations';
import type { DiscoverProfileRegistry } from '../customizations/profile_registry';
import { addProfile } from '../../common/customizations';

export interface DiscoverRoutesProps {
  prefix?: string;
  customizationCallbacks: CustomizationCallback[];
  customizationContext: DiscoverCustomizationContext;
  experimentalFeatures: ExperimentalFeatures;
}

export const DiscoverRoutes = ({ prefix, ...mainRouteProps }: DiscoverRoutesProps) => {
  const prefixPath = useCallback(
    (path: string) => (prefix ? `${prefix}/${path}` : `/${path}`),
    [prefix]
  );

  return (
    <Routes>
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
    </Routes>
  );
};

interface CustomDiscoverRoutesProps {
  profileRegistry: DiscoverProfileRegistry;
  customizationContext: DiscoverCustomizationContext;
  experimentalFeatures: ExperimentalFeatures;
}

export const CustomDiscoverRoutes = ({ profileRegistry, ...props }: CustomDiscoverRoutesProps) => {
  const { profile } = useParams<{ profile: string }>();
  const customizationCallbacks = useMemo(
    () => profileRegistry.get(profile)?.customizationCallbacks,
    [profile, profileRegistry]
  );

  if (customizationCallbacks) {
    return (
      <DiscoverRoutes
        prefix={addProfile('', profile)}
        customizationCallbacks={customizationCallbacks}
        {...props}
      />
    );
  }

  return <NotFoundRoute />;
};

export interface DiscoverRouterProps {
  services: DiscoverServices;
  profileRegistry: DiscoverProfileRegistry;
  customizationContext: DiscoverCustomizationContext;
  experimentalFeatures: ExperimentalFeatures;
  history: History;
}

export const DiscoverRouter = ({
  services,
  history,
  profileRegistry,
  ...routeProps
}: DiscoverRouterProps) => {
  const customizationCallbacks = useMemo(
    () => profileRegistry.get('default')?.customizationCallbacks ?? [],
    [profileRegistry]
  );

  return (
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <Router history={history} data-test-subj="discover-react-router">
          <Routes>
            <Route path={addProfile('', ':profile')}>
              <CustomDiscoverRoutes profileRegistry={profileRegistry} {...routeProps} />
            </Route>
            <Route path="/">
              <DiscoverRoutes customizationCallbacks={customizationCallbacks} {...routeProps} />
            </Route>
          </Routes>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  );
};
