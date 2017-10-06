import React from 'react';
import PropTypes from 'prop-types';
import { Home } from './home';
import { Directory } from './directory';
import {
  HashRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

export function HomeApp({ basePath, directories, directoryCategories }) {
  return (
    <Router>
      <Switch>
        <Route
          path="/home/directory"
        >
          <Directory
            basePath={basePath}
            directories={directories}
            directoryCategories={directoryCategories}
          />
        </Route>
        <Route
          path="/"
        >
          <Home
            basePath={basePath}
            directories={directories}
            directoryCategories={directoryCategories}
          />
        </Route>
      </Switch>
    </Router>
  )
};

HomeApp.propTypes = {
  basePath: PropTypes.string.isRequired,
  directories: PropTypes.object.isRequired,
  directoryCategories: PropTypes.object.isRequired
};
