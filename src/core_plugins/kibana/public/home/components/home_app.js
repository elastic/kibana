import React from 'react';
import PropTypes from 'prop-types';
import { Home } from './home';
import { FeatureDirectory } from './feature_directory';
import { TutorialDirectory } from './tutorial_directory';
import { Tutorial } from './tutorial';
import {
  HashRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

export function HomeApp({ addBasePath, directories, directoryCategories, tutorials }) {
  const renderTutorial = (props) => {
    const tutorial = tutorials.byId[props.match.params.id];
    if (!tutorial) {
      return (
        <div className="kuiView">
          <div className="kuiViewContent kuiViewContent--constrainedWidth">
            Unable to locate tutorial with id: {props.match.params.id}
          </div>
        </div>
      );
    }

    return (
      <Tutorial
        tutorial={tutorial}
      />
    );
  };

  const renderTutorialDirectory = (props) => {
    return (
      <TutorialDirectory
        addBasePath={addBasePath}
        tutorials={tutorials}
        openTab={props.match.params.tab}
      />
    );
  };

  return (
    <Router>
      <Switch>
        <Route
          path="/home/tutorial/:id"
          render={renderTutorial}
        />
        <Route
          path="/home/tutorial_directory/:tab?"
          render={renderTutorialDirectory}
        />
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
