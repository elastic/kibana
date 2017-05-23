import React from 'react';
import { Navbar } from '../navbar';
import { NavbarButton } from '../navbar_button';


import { Sidebar } from '../sidebar';
import { Workpad } from '../workpad';
import { ToggleEdit } from '../toggle_edit';

import './app.less';

export const App = () => (
  <div className="canvas">
    {/*
      <div className="canvas__app--expression">
      </div>
    */}
    <div className="canvas__main">
      <div className="canvas__app--workspace">
        <div className="canvas__app--title">
          <h2>Canvas <ToggleEdit /></h2>
        </div>
        <div className="canvas__app--workpad">
          <Workpad />
        </div>
      </div>
      <div className="canvas__app--sidebar">
        <Sidebar />
      </div>
    </div>
    <Navbar>
      <NavbarButton><i className="fa fa-plus" /> Add an element</NavbarButton>
      <NavbarButton><i className="fa fa-plus-square" /> Add a page</NavbarButton>
    </Navbar>
  </div>
);
