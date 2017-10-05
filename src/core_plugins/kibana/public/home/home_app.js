import React from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from 'react-router-dom';

export function HomeApp({ basePath }) {
  return (
    <Router>
      <div>
        Kibana Home { basePath }
      </div>
    </Router>
  );
}

HomeApp.propTypes = {
  basePath: PropTypes.string.isRequired
};
