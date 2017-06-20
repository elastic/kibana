import React from 'react';
import PropTypes from 'prop-types';

import { Navbar } from '../navbar';
import { Tray } from './tray';
import { NavbarButton } from '../navbar_button';
import { Expression } from '../expression';
import { ElementTypes } from './element_types';

import './toolbar.less';

export const Toolbar = ({ editing, tray, setTray, addElement, elementIsSelected }) => {
  const done = () => setTray(null);
  const showHideTray = (exp) => {
    if (tray && tray === exp) return done();
    setTray(exp);
  };

  const createElement = (name) => {
    const table = 'demodata().pointseries(y="median(cost)", x=time, color="project")';

    if (name === 'table') {
      addElement(table);
    } else {
      addElement(`${table}.plot(defaultStyle=seriesStyle(bars=0, lines=1, weight=0, points=0))`);
    }

    // clonse the tray
    done();
  };

  const trays = {
    elements: (<ElementTypes done={done} onClick={createElement} />),
    expression: !elementIsSelected ? null : (<Expression done={done} />),
  };

  return !editing ? null : (
    <div className="canvas__toolbar">
      {!trays[tray] ? null :
        (<Tray>{ trays[tray] }</Tray>)
      }
      <Navbar>
        <NavbarButton onClick={() => showHideTray('elements')}><i className="fa fa-plus" /> Add an element</NavbarButton>
        <NavbarButton><i className="fa fa-plus-square" /> Add a page</NavbarButton>
        { !elementIsSelected ? null :
          (<NavbarButton onClick={() => showHideTray('expression')}><i className="fa fa-terminal" /> Code</NavbarButton>)
        }
      </Navbar>
    </div>
  );
};

Toolbar.propTypes = {
  editing: PropTypes.bool,
  tray: PropTypes.node,
  setTray: PropTypes.func,
  addElement: PropTypes.func,
  elementIsSelected: PropTypes.bool,
};
