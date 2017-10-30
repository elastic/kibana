import React from 'react';
import PropTypes from 'prop-types';
import { Home } from './home';
import { FeatureDirectory } from './feature_directory';
import {
  HashRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

export function HomeApp({ addBasePath, directories, directoryCategories }) {
  return (
    <Router>
      <Switch>
        <Route
          path="/home/feature_directory"
        >
          <FeatureDirectory
            addBasePath={addBasePath}
            directories={directories}
            directoryCategories={directoryCategories}
          />
        </Route>
        <Route
          path="/"
        >
          <Home
            addBasePath={addBasePath}
            directories={directories}
            directoryCategories={directoryCategories}
          />
        </Route>
      </Switch>
    </Router>
  );
}

HomeApp.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.object.isRequired,
  directoryCategories: PropTypes.object.isRequired,
};
