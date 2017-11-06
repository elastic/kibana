import React from 'react';
import PropTypes from 'prop-types';
import { Sidebar } from '../sidebar';
import { Toolbar } from '../toolbar';
import { Workpad } from '../workpad';
import { WorkpadHeader } from '../workpad_header';
import { UpdateModal } from '../update_modal';

import './app.less';

export const AppComponent = ({ editing, deselectElement }) => (
  <div className="canvas">
    <div className="canvas__main">
      <UpdateModal />
      <div className="canvas__app--workspace" onMouseDown={deselectElement}>
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

AppComponent.propTypes = {
  editing: PropTypes.bool,
  deselectElement: PropTypes.func,
};
