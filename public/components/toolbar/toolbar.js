import React from 'react';
import PropTypes from 'prop-types';

import { Navbar } from '../navbar';
//import { Tray } from './tray';
import { NavbarButton } from '../navbar_button';

import './toolbar.less';

export const Toolbar = ({ editing }) => {
  const toolbar = editing ? (
    <div className="canvas__toolbar">
      { /*<Tray></Tray>*/ }
      <Navbar>
        <NavbarButton><i className="fa fa-plus" /> Add an element</NavbarButton>
        <NavbarButton><i className="fa fa-plus-square" /> Add a page</NavbarButton>
        <NavbarButton><i className="fa fa-terminal" /> Code</NavbarButton>

      </Navbar>
    </div>

  ) : null;

  return toolbar;
};

Toolbar.propTypes = {
  editing: PropTypes.bool,
};
