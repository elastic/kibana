import React from 'react';
import PropTypes from 'prop-types';
import { Toggle } from '../toggle';

import './workpad_header.less';

export const WorkpadHeader = ({ workpadName, editing, inFlight, toggleEditing }) => {

  return (
    <div className="canvas__workpad_header">
      <h2>
        { workpadName }
        <span className="canvas__workpad_header--editToggle canvas__workpad_header--button">
          <Toggle value={editing} onChange={toggleEditing} />
        </span>
        { inFlight && (
          <span className="canvas__workpad_header--button">
            <i className="fa fa-spinner fa-pulse" />
          </span>
        ) }
      </h2>
    </div>
  );
};

WorkpadHeader.propTypes = {
  workpadName: PropTypes.string,
  editing: PropTypes.bool,
  inFlight: PropTypes.bool,
  toggleEditing: PropTypes.func,
};
