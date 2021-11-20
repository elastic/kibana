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
import { KibanaContextProvider } from '../../../kibana_react/public';
import { ContextAppRoute } from './context';
import { SingleDocRoute } from './doc';
import { DiscoverMainRoute } from './main';
import { NotFoundRoute } from './not_found';
import { DiscoverServices } from '../build_services';
import { DiscoverMainProps } from './main/discover_main_route';

export const discoverRouter = (services: DiscoverServices, history: History) => {
  const mainRouteProps: DiscoverMainProps = {
    services,
    history,
  };

  return (
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <Router history={history} data-test-subj="discover-react-router">
          <Switch>
            <Route
              path="/context/:indexPatternId/:id"
              children={<ContextAppRoute services={services} />}
            />
            <Route
              path="/doc/:indexPattern/:index/:type"
              render={(props) => (
                <Redirect
                  to={`/doc/${props.match.params.indexPattern}/${props.match.params.index}`}
                />
              )}
            />
            <Route
              path="/doc/:indexPatternId/:index"
              children={<SingleDocRoute services={services} />}
            />
            <Route path="/view/:id" children={<DiscoverMainRoute {...mainRouteProps} />} />
            <Route path="/" exact children={<DiscoverMainRoute {...mainRouteProps} />} />
            <NotFoundRoute services={services} />
          </Switch>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  );
};
