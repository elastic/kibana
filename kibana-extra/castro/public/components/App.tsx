/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';

import Layout from './Layout/Layout';
import { Main } from './main';

export default props => {
  const renderMain = () => <Main {...props} />;

  return (
    <Router>
      <div>
        <Route path="/" exact={true} render={renderMain} />
        <Route path="/codebrowsing" component={Layout} />
      </div>
    </Router>
  );
};
