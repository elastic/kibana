import React from 'react';
import PropTypes from 'prop-types';
import { Home } from './home';
import { FeatureDirectory } from './feature_directory';
import {
  HashRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

export function HomeApp({ addBasePath, directories }) {
  return (
    <Router>
      <Switch>
        <Route
          path="/home/feature_directory"
        >
          <FeatureDirectory
            addBasePath={addBasePath}
            directories={directories}
          />
        </Route>
        <Route
          path="/home"
        >
          <Home
            addBasePath={addBasePath}
            directories={directories}
          />
        </Route>
      </Switch>
    </Router>
  );
}

HomeApp.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    showOnHomePage: PropTypes.bool.isRequired,
    category: PropTypes.string.isRequired
  }))
};
