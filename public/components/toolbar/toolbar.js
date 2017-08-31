import React from 'react';
import PropTypes from 'prop-types';

import { Navbar } from '../navbar';
import { Tray } from './tray';
import { NavbarButton } from '../navbar_button';
import { Expression } from '../expression';
import { Datasource } from '../datasource';
import { ElementTypes } from './element_types';
import { WorkpadLoader } from '../workpad_loader';

import './toolbar.less';

export const Toolbar = (props) => {
  const { editing,
    tray,
    setTray,
    addElement,
    elementLayer,
    addPage,
    previousPage,
    nextPage,
    elementIsSelected,
    selectedPageNumber,
  } = props;
  const done = () => setTray(null);
  const showHideTray = (exp) => {
    if (tray && tray === exp) return done();
    setTray(exp);
  };

  const createElement = (expression) => {
    addElement(expression);

    // close the tray
    done();
  };

  const trays = {
    elements: (<ElementTypes done={done} onClick={createElement} />),
    expression: !elementIsSelected ? null : (<Expression done={done} />),
    datasource: !elementIsSelected ? null : (<Datasource done={done} />),
    workpadloader: (<WorkpadLoader onClose={done} />),
  };

  return !editing ? null : (
    <div className="canvas__toolbar">
      {!trays[tray] ? null :
        (<Tray>{ trays[tray] }</Tray>)
      }
      <Navbar>
        <NavbarButton onClick={ previousPage }><i className="fa fa-chevron-left"/></NavbarButton>
        { selectedPageNumber }
        <NavbarButton onClick={ nextPage }><i className="fa fa-chevron-right"/></NavbarButton>

        <vr/>

        <NavbarButton onClick={() => showHideTray('workpadloader')}><i className="fa fa-file" /> Workpads</NavbarButton>

        <NavbarButton onClick={() => showHideTray('elements')}><i className="fa fa-plus" /> Add an element</NavbarButton>

        <NavbarButton onClick={ addPage }><i className="fa fa-plus-square" /> Add a page</NavbarButton>


        { !elementIsSelected ? null : ([
          <NavbarButton onClick={() => showHideTray('datasource')}><i className="fa fa-database" /> Datasource</NavbarButton>,
          <NavbarButton onClick={() => showHideTray('expression')}><i className="fa fa-terminal" /> Code</NavbarButton>,
          <vr/>,
          <NavbarButton onClick={ () => elementLayer(Infinity) }><i className="fa fa-arrow-circle-up" /></NavbarButton>,
          <NavbarButton onClick={ () => elementLayer(1) }><i className="fa fa-arrow-up" /></NavbarButton>,
          <NavbarButton onClick={ () => elementLayer(-1) }><i className="fa fa-arrow-down" /></NavbarButton>,
          <NavbarButton onClick={ () => elementLayer(-Infinity) }><i className="fa fa-arrow-circle-down" /></NavbarButton>,
        ]) }

      </Navbar>
    </div>
  );
};

Toolbar.propTypes = {
  editing: PropTypes.bool,
  tray: PropTypes.node,
  setTray: PropTypes.func.isRequired,
  addElement: PropTypes.func.isRequired,
  elementLayer: PropTypes.func,
  addPage: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  previousPage: PropTypes.func.isRequired,
  selectedPageNumber: PropTypes.number.isRequired,
  elementIsSelected: PropTypes.bool.isRequired,
};
