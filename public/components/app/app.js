import React from 'react';
import PropTypes from 'prop-types';

import { Sidebar } from '../sidebar';
import { Toolbar } from '../toolbar';

import { Workpad } from '../workpad';
import { WorkpadHeader } from '../workpad_header';


import './app.less';

export const App = ({ editing }) => (
  <div className="canvas">
    <div className="canvas__main">
      <div className="canvas__app--workspace">
        <WorkpadHeader />
        <div className="canvas__app--workpad">
          <Workpad />
        </div>
      </div>
      { editing ? (
        <div className="canvas__app--sidebar">
          <Sidebar />
        </div>
      ) : null }
    </div>
    { editing ? (
      <Toolbar />
    ) : null }

  </div>
);

App.propTypes = {
  editing: PropTypes.bool,
};
