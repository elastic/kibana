import React from 'react';
import PropTypes from 'prop-types';
import { Home } from './home';
import { FeatureDirectory } from './feature_directory';
import { TutorialDirectory } from './tutorial_directory';
import {
  HashRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

export function HomeApp({ addBasePath, directories, directoryCategories, tutorials }) {
  const renderTutorial = (props) => {
    return (
      <div>
        {tutorials.byName[props.match.params.tutorial_name].longDescription}
      </div>
    );
  };

  return (
    <Router>
      <Switch>
        <Route
          path="/home/tutorial/:tutorial_name"
          render={renderTutorial}
        />
        <Route
          path="/home/tutorial_directory"
        >
          <TutorialDirectory
            addBasePath={addBasePath}
            tutorials={tutorials}
          />
        </Route>
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
  tutorials: PropTypes.object.isRequired,
};
