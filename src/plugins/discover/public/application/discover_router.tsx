/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import React, { useCallback } from 'react';
import { History } from 'history';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ContextAppRoute } from './context';
import { SingleDocRoute } from './doc';
import { DiscoverMainRoute } from './main';
import { NotFoundRoute } from './not_found';
import { DiscoverServices } from '../build_services';
import { ViewAlertRoute } from './view_alert';
import {
  DiscoverContextProvider,
  DiscoverProfileRegistry,
  DiscoverRootContext,
  useDiscoverContext,
} from '../customizations';
import { addProfile } from '../../common/customizations';

export const DiscoverRoutes = () => {
  const { currentProfile } = useDiscoverContext();
  const prefixPath = useCallback(
    (path: string) => `${addProfile('', currentProfile.id)}/${path}`,
    [currentProfile.id]
  );

  return (
    <Routes key={currentProfile.id}>
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
        <DiscoverMainRoute />
      </Route>
      <Route path={prefixPath('')} exact>
        <DiscoverMainRoute />
      </Route>
      <NotFoundRoute />
    </Routes>
  );
};

export interface DiscoverRouterProps {
  services: DiscoverServices;
  history: History;
  profileRegistry: DiscoverProfileRegistry;
  rootContext: DiscoverRootContext;
}

export const DiscoverRouter = ({
  services,
  history,
  profileRegistry,
  rootContext,
}: DiscoverRouterProps) => {
  return (
    <KibanaContextProvider services={services}>
      <DiscoverContextProvider rootContext={rootContext} profileRegistry={profileRegistry}>
        <EuiErrorBoundary>
          <Router history={history} data-test-subj="discover-react-router">
            <Routes>
              <Route path={addProfile('', ':profile')}>
                <DiscoverRoutes />
              </Route>
              <Route path="/">
                <DiscoverRoutes />
              </Route>
            </Routes>
          </Router>
        </EuiErrorBoundary>
      </DiscoverContextProvider>
    </KibanaContextProvider>
  );
};
