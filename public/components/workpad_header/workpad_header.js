import React from 'react';
import PropTypes from 'prop-types';
import { Toggle } from '../toggle';

import './workpad_header.less';

export const WorkpadHeader = ({ workpadName, editing, toggleEditing }) => {
  return (
    <div className="canvas__workpad_header--title">
      <h2>
        { workpadName }
        <span className="canvas__workpad_header--editToggle">
          <Toggle value={editing} onChange={toggleEditing} />
        </span>
      </h2>
    </div>
  );
};

WorkpadHeader.propTypes = {
  workpadName: PropTypes.string,
  editing: PropTypes.boolean,
  toggleEditing: PropTypes.func,
};
