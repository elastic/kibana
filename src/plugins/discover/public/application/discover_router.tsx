/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Redirect, Route, Router, Switch } from 'react-router-dom';
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

export const discoverRouter = (services: DiscoverServices, history: History) => (
  <KibanaContextProvider services={services}>
    <EuiErrorBoundary>
      <Router history={history} data-test-subj="discover-react-router">
        <Switch>
          <Route path="/context/:indexPatternId/:id">
            <ContextAppRoute />
          </Route>
          <Route
            path="/doc/:indexPattern/:index/:type"
            render={(props) => (
              <Redirect
                to={`/doc/${props.match.params.indexPattern}/${props.match.params.index}`}
              />
            )}
          />
          <Route path="/doc/:indexPatternId/:index">
            <SingleDocRoute />
          </Route>
          <Route path="/viewAlert/:id">
            <ViewAlertRoute />
          </Route>
          <Route path="/view/:id">
            <DiscoverMainRoute />
          </Route>
          <Route path="/" exact>
            <DiscoverMainRoute />
          </Route>
          <NotFoundRoute />
        </Switch>
      </Router>
    </EuiErrorBoundary>
  </KibanaContextProvider>
);
