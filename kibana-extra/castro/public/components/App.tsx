import React from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';

import { Main } from './main';
import Layout from './Layout/Layout';

export default props => {
  return (
    <Router>
      <div>
        <Route path="/" exact render={() => <Main {...props} />}/>
        <Route path="/codebrowsing" component={Layout} />
      </div>
    </Router>
  );
};
