/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Route, Router, Routes } from 'react-router-dom';
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

export const discoverRouter = (services: DiscoverServices, history: History, isDev: boolean) => {
  const DicoveredRoute = () => {
    return (
      <KibanaContextProvider services={services}>
        <EuiErrorBoundary>
          <Router
            navigator={history}
            location={history.location}
            data-test-subj="discover-react-router"
          >
            <Routes>
              <Route path="/context/:dataViewId/:id" element={<ContextAppRoute />} />
              <Route path="/doc/:dataView/:index/:type" element={<SingleDocRoute />} />
              <Route path="/doc/:dataViewId/:index" element={<SingleDocRoute />} />
              <Route path="/viewAlert/:id" element={<ViewAlertRoute />} />
              <Route path="/view/:id" element={<DiscoverMainRoute isDev={isDev} />} />
              <Route path="/" element={<DiscoverMainRoute isDev={isDev} />} />
              <NotFoundRoute />
            </Routes>
          </Router>
        </EuiErrorBoundary>
      </KibanaContextProvider>
    );
  };

  return <DicoveredRoute />;
};
