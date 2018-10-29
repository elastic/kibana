/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter as Router, Redirect, Switch } from 'react-router-dom';

import { Admin } from './admin_page/admin';
import { Diff } from './diff_page/diff';
import { Layout } from './layout/layout';
import { NotFound } from './layout/not_found';
import { Route } from './route';
import * as ROUTES from './routes';
import { Search } from './search_page/search';

const Empty = () => null;

export const App = () => {
  const redirectToAdmin = () => <Redirect to="/admin" />;
  return (
    <Router>
      <Switch>
        <Route path={ROUTES.DIFF} component={Diff} />
        <Route path={ROUTES.ROOT} exact={true} render={redirectToAdmin} />
        <Route path={ROUTES.MAIN} component={Layout} />
        <Route path={ROUTES.ADMIN} component={Admin} />
        <Route path={ROUTES.SEARCH} component={Search} />
        <Route path={ROUTES.MAIN_ROOT} component={Layout} />
        <Route path={ROUTES.REPO} render={Empty} exact={true} />
        <Route path="*" component={NotFound} />
      </Switch>
    </Router>
  );
};
