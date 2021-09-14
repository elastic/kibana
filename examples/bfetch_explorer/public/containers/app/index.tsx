/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import { EuiPage } from '@elastic/eui';
import { useDeps } from '../../hooks/use_deps';
import { Sidebar } from './sidebar';
import { routes } from '../../routes';

export const App: React.FC = () => {
  const { appBasePath } = useDeps();

  const routeElements: React.ReactElement[] = [];
  for (const { items } of routes) {
    for (const { id, component } of items) {
      routeElements.push(<Route key={id} path={`/${id}`} render={(props) => component} />);
    }
  }

  return (
    <Router basename={appBasePath}>
      <EuiPage>
        <Sidebar />
        <Switch>
          {routeElements}
          <Redirect to="/count-until" />
        </Switch>
      </EuiPage>
    </Router>
  );
};
