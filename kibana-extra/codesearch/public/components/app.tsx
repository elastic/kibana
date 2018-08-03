/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectedRouter } from 'connected-react-router';
import React from 'react';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

import { history } from '../utils/url';
import { Admin } from './admin_page/admin';
import { Layout } from './layout/layout';
import { Main } from './main';
import { ReposManagement } from './repos_management/repos_management';

export const App = props => {
  const renderMain = () => <Main {...props} />;
  const renderRepos = () => <ReposManagement {...props} />;

  return (
    <ConnectedRouter history={history}>
      <Router>
        <Switch>
          <Route path="/" exact={true} render={renderMain} />
          <Route path="/repos" render={renderRepos} />
          <Route path="/:resource/:org/:repo/:revision/:path*:goto(!.*)?" component={Layout} />
          <Route path="/:resource/:org/:repo/:revision" component={Layout} />
          <Route path="/admin" component={Admin} />
        </Switch>
      </Router>
    </ConnectedRouter>
  );
};
