import React from 'react';
import PropTypes from 'prop-types';

import { Navbar } from '../navbar';
import { Tray } from './tray';
import { NavbarButton } from '../navbar_button';
import { Expression } from '../expression';
import { ElementTypes } from './element_types';

import './toolbar.less';

export const Toolbar = ({ editing, tray, setTray }) => {
  const done = () => setTray(null);
  const showHideTray = (exp) => {
    if (tray && tray.type === exp.type) return setTray(null);
    setTray(exp);
  };

  const ElementsTray = (<ElementTypes done={done} onClick={alert} />);
  const ExpressionTray = (<Expression done={done} />);

  return !editing ? null : (
    <div className="canvas__toolbar">
      {tray ? (<Tray>{ tray }</Tray>) : null }
      <Navbar>
        <NavbarButton onClick={() => showHideTray(ElementsTray)}><i className="fa fa-plus" /> Add an element</NavbarButton>
        <NavbarButton><i className="fa fa-plus-square" /> Add a page</NavbarButton>
        <NavbarButton onClick={() => showHideTray(ExpressionTray)}><i className="fa fa-terminal" /> Code</NavbarButton>
      </Navbar>
    </div>
  );
};

Toolbar.propTypes = {
  editing: PropTypes.bool,
  tray: PropTypes.node,
  setTray: PropTypes.func,
};
