/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route } from 'react-router-dom';

import { AppMountParameters } from 'kibana/public';
import { getServices } from '../kibana_services';
import { DiscoverMainRoute } from './apps/main';
import { ContextMainApp } from './apps/context';
import { KibanaContextProvider } from '../../../kibana_react/public';

export const renderApp = ({ element }: AppMountParameters) => {
  const services = getServices();
  const { history } = services;
  const opts = {
    services,
    history: history(),
    navigateTo: () => {},
    indexPatternList: [],
  };
  const app = (
    <Router history={history()}>
      <KibanaContextProvider services={services}>
        <Switch>
          <Route path="/context/:indexPatternId/:id" children={<ContextMainApp history={history} indexPatternList={[]} services={services} savedSearch={undefined}/>} />
          <Route path="/" exact children={<DiscoverMainRoute opts={opts} />} />
        </Switch>
      </KibanaContextProvider>
    </Router>
  );
  ReactDOM.render(app, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
