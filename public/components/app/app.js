import React from 'react';
import PropTypes from 'prop-types';

import { Navbar } from '../navbar';
import { NavbarButton } from '../navbar_button';


import { Sidebar } from '../sidebar';
import { Workpad } from '../workpad';
import { ToggleEditing } from './toggle_editing';

import './app.less';

export const App = ({ editing, toggleEditing }) => (
  <div className="canvas">
    {/*
      <div className="canvas__app--expression">
      </div>
    */}
    <div className="canvas__main">
      <div className="canvas__app--workspace">
        <div className="canvas__app--title">
          <h2>
            Canvas
            <ToggleEditing value={editing} toggle={toggleEditing} />
          </h2>
        </div>
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
      <Navbar>
        <NavbarButton><i className="fa fa-plus" /> Add an element</NavbarButton>
        <NavbarButton><i className="fa fa-plus-square" /> Add a page</NavbarButton>
      </Navbar>
    ) : null }

  </div>
);

App.propTypes = {
  editing: PropTypes.bool,
  toggleEditing: PropTypes.func,
};
