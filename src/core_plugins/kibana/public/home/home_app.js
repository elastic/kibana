import React from 'react';
import PropTypes from 'prop-types';
import { Home } from './home';
import { Directory } from './directory';
import {
  HashRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

export function HomeApp({ basePath }) {
  return (
    <Router>
      <Switch>
        <Route
          path='/home/directory'
          component={() => <Directory></Directory>}
        />
        <Route
          path='/'
          component={() => <Home></Home>}
        />
      </Switch>
    </Router>
  )
}

HomeApp.propTypes = {
  basePath: PropTypes.string.isRequired
};
