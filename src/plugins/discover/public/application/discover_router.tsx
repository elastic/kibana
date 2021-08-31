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
import { KibanaContextProvider } from '../../../kibana_react/public';
import { ContextAppRoute } from './apps/context';
import { SingleDocRoute } from './apps/doc';
import { DiscoverMainRoute } from './apps/main';
import { NotFoundRoute } from './apps/not_found';
import { DiscoverServices } from '../build_services';
import { DiscoverMainProps } from './apps/main/discover_main_route';

export const discoverRouter = (services: DiscoverServices, history: History) => {
  const mainRouteProps: DiscoverMainProps = {
    services,
    history,
  };
  return (
    <Router history={history} data-test-subj="discover-react-router">
      <KibanaContextProvider services={services}>
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
      </KibanaContextProvider>
    </Router>
  );
};
